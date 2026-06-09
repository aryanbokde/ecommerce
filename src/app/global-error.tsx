"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // logError() is Node.js/Winston — call the server via API instead.
    // keepalive: true ensures the request completes even if the page unmounts.
    fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        route: typeof window !== "undefined" ? window.location.pathname : "unknown",
      }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          background: "#fafafa",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div
              style={{
                margin: "0 auto 0.5rem",
                display: "flex",
                width: "3rem",
                height: "3rem",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "9999px",
                background: "rgba(239,68,68,0.1)",
              }}
            >
              <AlertCircle style={{ width: "1.5rem", height: "1.5rem", color: "#ef4444" }} />
            </div>
            <CardTitle className="text-xl">Something went wrong</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Our team has been notified. Please try again.
            </p>

            {error.digest && (
              <Alert variant="destructive">
                <AlertDescription className="font-mono text-xs">
                  Error ID: {error.digest}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="justify-center gap-3">
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
              Go to home
            </Button>
          </CardFooter>
        </Card>
      </body>
    </html>
  );
}
