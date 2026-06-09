"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient, adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // No explicit baseURL → the client calls /api/auth on the SAME origin the page
  // was served from. Hardcoding localhost broke sign-in whenever the app was
  // reached via 127.0.0.1 or any other host (CORS preflight failure on the
  // cross-origin POST). Same-origin works for localhost, 127.0.0.1, and prod.
  plugins: [
    twoFactorClient({
      // Auth pages live at root URLs (the (auth) route group), so no /auth prefix.
      onTwoFactorRedirect() {
        window.location.href = "/two-factor";
      },
    }),
    adminClient(),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  twoFactor,
  admin: adminActions,
} = authClient;
