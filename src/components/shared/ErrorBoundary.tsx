"use client";

import { ErrorBoundary as ReactErrorBoundary, type FallbackProps } from "react-error-boundary";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ErrorFallback from "./ErrorFallback";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

function FullPageFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{message}</p>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button onClick={resetErrorBoundary} variant="default">
            Try again
          </Button>
          <Button variant="outline" render={<Link href="/" />}>
            Go home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ErrorBoundary({ children }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary FallbackComponent={FullPageFallback}>
      {children}
    </ReactErrorBoundary>
  );
}

export { ErrorFallback };
