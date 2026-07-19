import { useCallback, useRef, useState } from "react";
import { auth } from "@/lib/firebase";

interface UploadProgress {
  percentage: number;
  loaded: number;
  total: number;
}

export interface UploadResult {
  url: string;
  key: string;
  name: string;
  contentType: string;
  size: number;
}

export interface UploadError extends Error {
  code?: string;
  retryable?: boolean;
}

interface UploadOptions {
  uploadId?: string;
  onProgress?: (progress: UploadProgress) => void;
}

interface UploadSession {
  cancelled: boolean;
  request?: XMLHttpRequest;
}

function createUploadError(message: string, code?: string, retryable = true): UploadError {
  const error = new Error(message) as UploadError;
  error.code = code;
  error.retryable = retryable;
  return error;
}

function responseData(xhr: XMLHttpRequest) {
  if (xhr.response && typeof xhr.response === "object") return xhr.response as { error?: string; code?: string; retryable?: boolean; url?: string; key?: string; name?: string; contentType?: string; size?: number };
  try {
    return JSON.parse(xhr.responseText || "{}") as { error?: string; code?: string; retryable?: boolean; url?: string; key?: string; name?: string; contentType?: string; size?: number };
  } catch {
    return {};
  }
}

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({ percentage: 0, loaded: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const activeUploads = useRef(new Map<string, UploadSession>());
  const activeCount = useRef(0);

  const uploadToServer = useCallback(async (file: File, folder: string, session: UploadSession, options: UploadOptions, token: string) => {
    return new Promise<UploadResult>((resolve, reject) => {
      if (session.cancelled) {
        reject(createUploadError("Upload cancelled", "UPLOAD_CANCELLED", false));
        return;
      }
      const xhr = new XMLHttpRequest();
      session.request = xhr;
      const form = new FormData();
      form.append("folder", folder);
      form.append("fileName", file.name);
      form.append("contentType", file.type || "application/octet-stream");
      form.append("file", file, file.name);

      xhr.open("POST", "/api/upload/r2");
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.responseType = "json";
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const next = { percentage: Math.min(100, Math.round((event.loaded / event.total) * 100)), loaded: event.loaded, total: event.total };
        setProgress(next);
        options.onProgress?.(next);
      };
      xhr.onload = () => {
        const data = responseData(xhr);
        if (xhr.status < 200 || xhr.status >= 300 || !data.url || !data.key) {
          const retryable = data.retryable ?? xhr.status >= 500;
          reject(createUploadError(data.error || `Upload failed (HTTP ${xhr.status})`, data.code || "UPLOAD_FAILED", retryable));
          return;
        }
        const completed = { percentage: 100, loaded: file.size, total: file.size };
        setProgress(completed);
        options.onProgress?.(completed);
        resolve({
          url: data.url,
          key: data.key,
          name: data.name || file.name,
          contentType: data.contentType || file.type || "application/octet-stream",
          size: Number(data.size || file.size),
        });
      };
      xhr.onerror = () => reject(createUploadError("Network error while uploading to the server. Check your connection and retry.", "NETWORK_ERROR"));
      xhr.ontimeout = () => reject(createUploadError("The server upload timed out. Retry the upload.", "UPLOAD_TIMEOUT"));
      xhr.onabort = () => reject(createUploadError("Upload cancelled", "UPLOAD_CANCELLED", false));
      xhr.send(form);
    });
  }, []);

  const cancelUpload = useCallback((uploadId?: string) => {
    const sessions = uploadId
      ? [activeUploads.current.get(uploadId)].filter(Boolean) as UploadSession[]
      : [...activeUploads.current.values()];
    sessions.forEach((session) => {
      session.cancelled = true;
      session.request?.abort();
    });
  }, []);

  const uploadFile = useCallback(async (file: File, folder = "uploads", options: UploadOptions = {}): Promise<UploadResult> => {
    const sessionId = options.uploadId || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const session: UploadSession = { cancelled: false };
    activeUploads.current.set(sessionId, session);
    activeCount.current += 1;
    setUploading(true);
    setError(null);
    setProgress({ percentage: 0, loaded: 0, total: file.size });

    try {
      if (!file.size) throw createUploadError("The selected file is empty.", "INVALID_FILE", false);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw createUploadError("Admin authentication expired. Sign in again.", "ADMIN_AUTH_REQUIRED", false);
      let lastError: UploadError | null = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          return await uploadToServer(file, folder, session, options, token);
        } catch (uploadError) {
          lastError = uploadError as UploadError;
          if (!lastError.retryable || lastError.code === "UPLOAD_CANCELLED" || attempt === 2 || session.cancelled) throw lastError;
          await new Promise((resolve) => setTimeout(resolve, 750 * 2 ** attempt));
        }
      }
      throw lastError || createUploadError("Server-side R2 upload failed", "UPLOAD_FAILED");
    } catch (uploadError) {
      const error = uploadError as UploadError;
      setError(error.message || "Server-side R2 upload failed");
      throw error;
    } finally {
      activeUploads.current.delete(sessionId);
      activeCount.current = Math.max(0, activeCount.current - 1);
      setUploading(activeCount.current > 0);
    }
  }, [uploadToServer]);

  return { uploadFile, cancelUpload, uploading, progress, error };
}
