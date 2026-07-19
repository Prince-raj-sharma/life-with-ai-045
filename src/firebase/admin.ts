import * as admin from "firebase-admin";

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dummy-project";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "dummy@dummy-project.iam.gserviceaccount.com";
const privateKey = process.env.FIREBASE_PRIVATE_KEY 
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  : "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3\n-----END PRIVATE KEY-----\n";

function initAdmin() {
  if (!admin.apps.length) {
    try {
      if (projectId !== "dummy-project" && clientEmail !== "dummy@dummy-project.iam.gserviceaccount.com") {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      } else {
        admin.initializeApp({
          projectId: "dummy-project",
        });
      }
    } catch (error) {
      console.warn("Firebase Admin Init Warning:", error);
    }
  }
  return admin;
}

// Lazy Proxies to prevent background gRPC socket pools from hanging Next.js build workers
export const adminApp = new Proxy({} as admin.app.App, {
  get(_target, prop) {
    return (initAdmin().app() as unknown as Record<string, unknown>)[prop as string];
  }
});

export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(_target, prop) {
    return (initAdmin().auth() as unknown as Record<string, unknown>)[prop as string];
  }
});

export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_target, prop) {
    return (initAdmin().firestore() as unknown as Record<string, unknown>)[prop as string];
  }
});
