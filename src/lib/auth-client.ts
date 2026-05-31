"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

// ── Client-side better-auth instance ─────────────────────────────────────────
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  plugins: [
    adminClient(), // exposes authClient.admin.* role management methods
  ],
});

// ── Named exports for ergonomic imports ───────────────────────────────────────
//
//  signIn  → object with methods: signIn.email({ email, password })
//                                  signIn.social({ provider: "google" })
//  signUp  → object with methods: signUp.email({ email, password, name })
//  signOut → function: signOut()
//  useSession → React hook: const { data: session, isPending } = useSession()
//
export const { signIn, signOut, signUp, useSession } = authClient;
