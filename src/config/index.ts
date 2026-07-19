export const APP_CONFIG = {
  name: "LIFE WITH AI",
  description: "Commercial EdTech Platform for Programming & AI Mastery",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  adminEmail: "princerajpiyush84@gmail.com",
  defaultCurrency: "INR",
  maxUploadSizeMB: 500,
};

export const CLOUDINARY_CONFIG = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || "demo",
  apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY || "",
};
