// Backwards-compatible upload endpoint. All uploads are now stored in Cloudflare R2.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export { POST } from "@/app/api/upload/r2/route";
