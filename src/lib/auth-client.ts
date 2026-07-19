import type { User } from "firebase/auth";

export async function syncAuthProfile(
  user: User,
  profile: {
    displayName?: string | null;
    mobile?: string;
    photoURL?: string | null;
  }
) {
  const idToken = await user.getIdToken();
  const response = await fetch("/api/auth/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(data?.error || "Could not save your account profile.");
  }

  return response.json() as Promise<{ status: string; role?: string; emailVerified?: boolean }>;
}
