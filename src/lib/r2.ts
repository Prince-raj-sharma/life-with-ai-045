import { CopyObjectCommand, DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "node:stream";

const accountId = process.env.R2_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");

export const r2 = new S3Client({
  region: "auto",
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export function assertR2Config() {
  const missing = [
    ["R2_ACCESS_KEY_ID", accessKeyId],
    ["R2_SECRET_ACCESS_KEY", secretAccessKey],
    ["R2_BUCKET_NAME", process.env.R2_BUCKET_NAME || ""],
    ["R2_ENDPOINT or R2_ACCOUNT_ID", endpoint],
    ["R2_PUBLIC_URL", process.env.R2_PUBLIC_URL || ""],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Cloudflare R2 is not configured. Missing: ${missing.join(", ")}`);
  }
}

export function getR2PublicUrl(key: string) {
  assertR2Config();
  return `${process.env.R2_PUBLIC_URL!.replace(/\/$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function safeR2Segment(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120) || "file";
}

type R2StreamUploadOptions = {
  key: string;
  body: Readable | ReadableStream<Uint8Array>;
  contentType: string;
  contentLength?: number;
  metadata?: Record<string, string>;
};

export function startR2StreamUpload({ key, body, contentType, contentLength, metadata }: R2StreamUploadOptions) {
  assertR2Config();
  const upload = new Upload({
    client: r2,
    params: {
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: contentType,
      ...(contentLength !== undefined ? { ContentLength: contentLength } : {}),
      ...(metadata ? { Metadata: metadata } : {}),
    },
    queueSize: 4,
    partSize: 16 * 1024 * 1024,
    leavePartsOnError: false,
  });

  const done = upload.done().then(() => ({ key, url: getR2PublicUrl(key) }));
  return { upload, done };
}

export async function putR2Object({
  key,
  body,
  contentType,
  contentLength,
}: {
  key: string;
  body: Buffer | Readable | ReadableStream<Uint8Array>;
  contentType: string;
  contentLength?: number;
}) {
  assertR2Config();
  const params = {
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: body,
    ContentType: contentType,
    ...(contentLength !== undefined ? { ContentLength: contentLength } : {}),
  };

  if (Buffer.isBuffer(body)) {
    await r2.send(new PutObjectCommand(params));
  } else {
    await startR2StreamUpload({ key, body, contentType, contentLength }).done;
  }

  return { key, url: getR2PublicUrl(key) };
}

export async function deleteR2Objects(keys: string[]) {
  if (!keys.length) return;
  assertR2Config();
  for (let index = 0; index < keys.length; index += 1000) {
    const chunk = keys.slice(index, index + 1000);
    await r2.send(new DeleteObjectsCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
    }));
  }
}

export async function moveR2Object({
  sourceKey,
  destinationKey,
  contentType,
}: {
  sourceKey: string;
  destinationKey: string;
  contentType?: string;
}) {
  assertR2Config();
  if (sourceKey === destinationKey) return { key: destinationKey, url: getR2PublicUrl(destinationKey) };

  await r2.send(new CopyObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: destinationKey,
    CopySource: encodeURIComponent(`${process.env.R2_BUCKET_NAME!}/${sourceKey}`),
    ...(contentType ? { ContentType: contentType, MetadataDirective: "REPLACE" as const } : { MetadataDirective: "COPY" as const }),
  }));
  await deleteR2Objects([sourceKey]);
  return { key: destinationKey, url: getR2PublicUrl(destinationKey) };
}
