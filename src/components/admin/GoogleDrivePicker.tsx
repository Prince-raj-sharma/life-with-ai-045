"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Cloud, Loader2, RotateCcw } from "lucide-react";
import { useToast } from "@/providers/ToastProvider";
import { auth } from "@/lib/firebase";

interface GooglePickerFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  folderPath?: string;
  parentFolder?: string;
  folderSegments?: string[];
  folderIds?: string[];
  rootFolderId?: string;
  createdTime?: string;
}

interface TokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
}

interface PickerView {
  setIncludeFolders: (include: boolean) => PickerView;
  setSelectFolderEnabled: (enabled: boolean) => PickerView;
  setMimeTypes: (mimeTypes: string) => PickerView;
}

interface PickerInstance {
  setVisible: (visible: boolean) => void;
}

interface PickerBuilder {
  addView: (view: PickerView) => PickerBuilder;
  enableFeature: (feature: string) => PickerBuilder;
  setAppId: (appId: string) => PickerBuilder;
  setCallback: (callback: (data: { action?: string; docs?: GooglePickerFile[] }) => void) => PickerBuilder;
  setDeveloperKey: (key: string) => PickerBuilder;
  setOAuthToken: (token: string) => PickerBuilder;
  setOrigin: (origin: string) => PickerBuilder;
  build: () => PickerInstance;
}

interface GoogleApi {
  accounts: {
    oauth2: {
      initTokenClient: (options: {
        client_id: string;
        scope: string;
        callback: (response: { access_token?: string; error?: string }) => void;
        error_callback?: (error: { type?: string }) => void;
      }) => TokenClient;
    };
  };
  picker: {
    Action: { PICKED: string; CANCEL: string };
    Feature: { MULTISELECT_ENABLED: string };
    DocsView: new () => PickerView;
    PickerBuilder: new () => PickerBuilder;
  };
}

interface GapiApi {
  load: (module: string, callback: () => void) => void;
  client?: {
    load: (discoveryUrl: string) => Promise<void>;
  };
}

declare global {
  interface Window {
    google?: GoogleApi;
    gapi?: GapiApi;
  }
}

let googleApisPromise: Promise<void> | null = null;

function loadScript(id: string, src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      const globalLoaded = id === "google-identity-services" ? Boolean(window.google?.accounts?.oauth2) : Boolean(window.gapi);
      if (existing.dataset.loaded === "true" || globalLoaded) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Could not load ${src}`)), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.body.appendChild(script);
  });
}

function initializeGoogleApis() {
  if (googleApisPromise) return googleApisPromise;

  googleApisPromise = (async () => {
    await Promise.all([
      loadScript("google-identity-services", "https://accounts.google.com/gsi/client"),
      loadScript("google-api-loader", "https://apis.google.com/js/api.js"),
    ]);

    if (!window.gapi) throw new Error("Google API loader is unavailable");

    await new Promise<void>((resolve) => {
      window.gapi!.load("client:picker", resolve);
    });

    if (!window.gapi.client) throw new Error("Google API client could not be initialized");
    await window.gapi.client.load("https://www.googleapis.com/discovery/v1/apis/drive/v3/rest");

    if (!window.google?.picker?.PickerBuilder) throw new Error("Google Picker could not be initialized");
  })().catch((error) => {
    googleApisPromise = null;
    throw error;
  });

  return googleApisPromise;
}

export default function GoogleDrivePicker({
  courseId,
  folderId,
  onImported,
}: {
  courseId: string;
  folderId: string;
  onImported: () => void | Promise<unknown>;
}) {
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [loadingScripts, setLoadingScripts] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [failedFiles, setFailedFiles] = useState<GooglePickerFile[]>([]);
  const [retryToken, setRetryToken] = useState<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const developerKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;
  const configured = Boolean(clientId && developerKey && appId);

  const loadGoogle = useCallback(async () => {
    if (!configured) {
      setSetupError("Add the Google Picker environment variables before importing.");
      setLoadingScripts(false);
      return;
    }
    setLoadingScripts(true);
    setSetupError(null);
    setReady(false);
    try {
      await initializeGoogleApis();
      setReady(true);
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Google Picker could not be loaded");
    } finally {
      setLoadingScripts(false);
    }
  }, [configured]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadGoogle();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadGoogle]);

  const adminHeaders = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Admin authentication expired. Sign in again.");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }, []);

  const importFiles = useCallback(async (accessToken: string, selectedFiles: GooglePickerFile[]) => {
    setBusy(true);
    setFailedFiles([]);
    setProgress({ completed: 0, total: selectedFiles.length });
    const failed: GooglePickerFile[] = [];
    let skipped = 0;

    try {
      const resolveResponse = await fetch("/api/google-drive/import", {
        method: "POST",
        headers: await adminHeaders(),
        body: JSON.stringify({ action: "resolve", courseId, folderId, accessToken, files: selectedFiles }),
      });
      const resolved = await resolveResponse.json() as { error?: string; files?: GooglePickerFile[] };
      if (!resolveResponse.ok) throw new Error(resolved.error || "Google Drive file resolution failed");
      const files = resolved.files || [];
      if (!files.length) {
        toast({ message: "No supported files were found in the selection.", type: "info" });
        return;
      }
      setProgress({ completed: 0, total: files.length });

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        try {
          const response = await fetch("/api/google-drive/import", {
            method: "POST",
            headers: await adminHeaders(),
            body: JSON.stringify({ courseId, folderId, accessToken, files: [file] }),
          });
          const result = await response.json() as { error?: string; items?: unknown[]; skipped?: string[] };
          if (!response.ok) throw new Error(result.error || `Could not import ${file.name}`);
          skipped += result.skipped?.length || 0;
        } catch (error) {
          failed.push(file);
          toast({ title: `Could not import ${file.name}`, message: error instanceof Error ? error.message : "Import failed", type: "error" });
        } finally {
          setProgress({ completed: index + 1, total: files.length });
        }
      }

      setFailedFiles(failed);
      setRetryToken(accessToken);
      await onImported();
      if (failed.length) {
        toast({ title: "Import completed with errors", message: `${failed.length} file(s) failed. Retry is available below.`, type: "error" });
      } else {
        toast({ title: "Drive import complete", message: `${files.length - skipped} file(s) copied to Cloudflare R2${skipped ? `; ${skipped} duplicate(s) skipped` : ""}.`, type: "success" });
      }
    } finally {
      setBusy(false);
    }
  }, [adminHeaders, courseId, folderId, onImported, toast]);

  const retryFailed = async () => {
    if (retryToken && failedFiles.length) await importFiles(retryToken, failedFiles);
  };

  const openGooglePicker = useCallback((accessToken: string) => {
    console.log("[PICKER] openGooglePicker()");
    const googleApi = window.google;
    if (!ready || !window.gapi?.client || !googleApi?.picker?.PickerBuilder) {
      setBusy(false);
      toast({ title: "Google Picker is not ready", message: "Wait for Google services to finish loading and try again.", type: "error" });
      return;
    }

    try {
      const picker: PickerInstance = new googleApi.picker.PickerBuilder()
        .setAppId(appId!)
        .setDeveloperKey(developerKey!)
        .setOAuthToken(accessToken)
        .setOrigin(`${window.location.protocol}//${window.location.host}`)
        .enableFeature(googleApi.picker.Feature.MULTISELECT_ENABLED)
        .addView(new googleApi.picker.DocsView().setIncludeFolders(true).setSelectFolderEnabled(true))
        .setCallback((data) => {
          if (data.action === googleApi.picker.Action.CANCEL) {
            setBusy(false);
            return;
          }
          if (data.action === googleApi.picker.Action.PICKED && data.docs?.length) {
            picker.setVisible(false);
            void importFiles(accessToken, data.docs);
            return;
          }
          setBusy(false);
        })
        .build();

      picker.setVisible(true);
    } catch (error) {
      setBusy(false);
      toast({ title: "Google Picker could not open", message: error instanceof Error ? error.message : "Reload the page and try again.", type: "error" });
    }
  }, [appId, developerKey, importFiles, ready, toast]);

  const handleTokenResponse = useCallback((tokenResponse: { access_token?: string; error?: string }) => {
    console.log("[PICKER] OAuth callback");
    console.log(tokenResponse);
    if (!tokenResponse.access_token) {
      setBusy(false);
      toast({ title: "Google Drive authorization failed", message: tokenResponse.error || "Grant Drive read access and try again.", type: "error" });
      return;
    }
    accessTokenRef.current = tokenResponse.access_token;
    console.log("[PICKER] Access Token:", tokenResponse.access_token);
    openGooglePicker(tokenResponse.access_token);
  }, [openGooglePicker, toast]);

  const openPicker = () => {
    console.log("[PICKER] Button clicked");
    if (!configured) {
      toast({ title: "Google Drive is not configured", message: "Add NEXT_PUBLIC_GOOGLE_CLIENT_ID, NEXT_PUBLIC_GOOGLE_API_KEY and NEXT_PUBLIC_GOOGLE_APP_ID.", type: "error" });
      return;
    }
    if (!ready || !window.google) {
      toast({ message: setupError || "Google Picker is still loading. Try again in a moment.", type: "error" });
      return;
    }
    setBusy(true);
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId!,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      callback: handleTokenResponse,
      error_callback: () => {
        setBusy(false);
        toast({ title: "Google Drive authorization was cancelled", message: "Keep the OAuth popup open and allow Drive read access.", type: "error" });
      },
    });
    // This call stays directly inside the button event, preventing popup blockers.
    console.log("[PICKER] OAuth request started");
    tokenClient.requestAccessToken({ prompt: accessTokenRef.current ? "" : "consent" });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={openPicker} disabled={busy || loadingScripts} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-blue-400 hover:text-[#1D4ED8] disabled:cursor-wait disabled:opacity-60">
        {busy || loadingScripts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
        {loadingScripts ? "Loading Google Drive..." : busy && progress ? `Importing ${progress.completed}/${progress.total}...` : "Import from Google Drive"}
      </button>
      {setupError && !loadingScripts && <button type="button" onClick={() => void loadGoogle()} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title={setupError}><RotateCcw className="h-4 w-4" /></button>}
      {failedFiles.length > 0 && !busy && <button type="button" onClick={() => void retryFailed()} className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100">Retry failed ({failedFiles.length})</button>}
    </div>
  );
}
