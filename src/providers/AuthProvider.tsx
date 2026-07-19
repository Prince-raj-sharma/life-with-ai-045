"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  logout: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const ADMIN_EMAIL = "princerajpiyush84@gmail.com";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const fetchProfile = async (firebaseUser: User): Promise<UserProfile> => {
    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        const nextProfile: UserProfile = {
          ...data,
          emailVerified: firebaseUser.emailVerified,
        };
        // Check if email matches admin email and ensure admin role
        if (firebaseUser.email?.toLowerCase() === ADMIN_EMAIL && data.role !== "admin") {
          const updated: UserProfile = { ...nextProfile, role: "admin" };
          await setDoc(userDocRef, updated, { merge: true });
          return updated;
        } else {
          if (data.emailVerified !== firebaseUser.emailVerified) {
            await setDoc(userDocRef, { emailVerified: firebaseUser.emailVerified }, { merge: true });
          }
          return nextProfile;
        }
      } else {
        // Create initial profile
        const role = firebaseUser.email?.toLowerCase() === ADMIN_EMAIL ? "admin" : "student";
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
          photoURL: firebaseUser.photoURL || "",
          role,
          createdAt: new Date().toISOString(),
          emailVerified: firebaseUser.emailVerified || false,
          purchasedCourses: [],
          wishlist: [],
          bookmarks: [],
        };
        await setDoc(userDocRef, newProfile, { merge: true });
        return newProfile;
      }
    } catch (err) {
      console.warn("Could not fetch or create Firestore user profile:", err);
      // Fallback safe profile in case Firestore is unreachable with placeholder keys
      const role = firebaseUser.email?.toLowerCase() === ADMIN_EMAIL ? "admin" : "student";
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        displayName: firebaseUser.displayName || "User",
        role,
        createdAt: new Date().toISOString(),
        emailVerified: firebaseUser.emailVerified || false,
        purchasedCourses: [],
        wishlist: [],
        bookmarks: [],
      };
    }
  };

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;
    let authUpdate = 0;

    const handleAuthState = async (firebaseUser: User | null) => {
      const updateId = ++authUpdate;

      if (!mounted) return;
      setLoading(true);
      setUser(firebaseUser);
      setProfile(null);

      if (!firebaseUser) {
        if (mounted && updateId === authUpdate) {
          setLoading(false);
        }
        return;
      }

      try {
        const nextProfile = await fetchProfile(firebaseUser);
        if (mounted && updateId === authUpdate) {
          setProfile(nextProfile);
        }
      } finally {
        if (mounted && updateId === authUpdate) {
          setLoading(false);
        }
      }
    };

    const initializeAuth = async () => {
      try {
        // Firebase restores browser persistence before this promise resolves.
        await auth.authStateReady();
        if (!mounted) return;

        // Subscribe only after initialization so the first route decision uses
        // Firebase's restored currentUser rather than the initial null state.
        unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          void handleAuthState(firebaseUser);
        });
      } catch (error) {
        console.error("Firebase auth initialization failed:", error);
        if (mounted) {
          await handleAuthState(null);
        }
      }
    };

    void initializeAuth();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  const refreshProfile = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const nextProfile = await fetchProfile(currentUser);
      setProfile(nextProfile);
    } else {
      setProfile(null);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isAdmin = profile?.role === "admin" || user?.email?.toLowerCase() === ADMIN_EMAIL;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
