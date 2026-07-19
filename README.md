This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Course files and media storage

Course curriculum is stored as a Drive-style hierarchy:

- `courseFolders`: `{ id, courseId, name, order, createdAt }`
- `courseItems`: `{ id, courseId, folderId, type, title, url, videoUrl, pdfUrl, thumbnail, duration, size, order, createdAt, updatedAt, storageKey, mimeType }`

Each video or PDF is an item inside one folder. Existing `lessons` records are read as a compatibility view, so older courses continue to render while new content uses the two collections above.

Uploads use a same-origin `POST /api/upload/r2` multipart request. The browser never contacts the R2 endpoint. The Next.js Node runtime parses the request as a stream and uses the AWS SDK multipart uploader with retries, backpressure, progress reporting, and cancellation on client disconnect. Google Drive imports use the same server-side R2 streaming helper.

### Required Cloudflare R2 configuration

Set these server-side variables in `.env.local` and the deployment environment:

```text
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://<public-bucket-domain-or-custom-domain>
```

Create an R2 API token with Object Read and Object Write access for the course bucket. Upload CORS is not required because only the Next.js server communicates with R2. `R2_PUBLIC_URL` must serve uploaded objects because item metadata stores the public playback/PDF URL. R2 object responses must preserve byte-range requests for video seeking.

### Required Google Cloud configuration

1. Enable Google Drive API and Google Picker API in the Google Cloud project.
2. Configure the OAuth consent screen and add the admin account as a test user while the app is in testing mode.
3. Create a Web application OAuth client ID. Add every production and local app origin to its authorized JavaScript origins.
4. Create a browser API key restricted by HTTP referrer and restrict it to the Picker/Drive APIs.
5. Set the following public variables:

```text
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_API_KEY=...
NEXT_PUBLIC_GOOGLE_APP_ID=<google-cloud-project-number>
```

The Picker requests `https://www.googleapis.com/auth/drive.readonly`; it accepts only PDFs and video files. No Drive URL is stored or entered by an administrator.
