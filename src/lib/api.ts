"use client";

import axios from "axios";
import axiosRetry from "axios-retry";
import { parseApiError } from "@/lib/api-error";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  withCredentials: true, // send session_token cookie on every request
  headers: { "Content-Type": "application/json" },
});

// Retry up to 3 times on network errors or 5xx, with exponential backoff
axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) =>
    axiosRetry.isNetworkError(error) || axiosRetry.isRetryableError(error),
});

// Normalize every error into AppError so callers get a consistent shape
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(parseApiError(error))
);

export default api;
