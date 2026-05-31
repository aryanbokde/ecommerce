import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Handles all better-auth routes under /api/auth/*
// e.g. /api/auth/sign-in/email, /api/auth/sign-up/email, /api/auth/sign-out
export const { GET, POST } = toNextJsHandler(auth);
