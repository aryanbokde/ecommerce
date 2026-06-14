import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md rounded-2xl text-center shadow-lg">
        <CardHeader>
          <p className="font-[family-name:var(--font-heading)] text-8xl font-bold leading-none tracking-tight text-primary">
            404
          </p>
          <CardTitle className="mt-3 text-xl text-foreground">
            Page not found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </CardContent>
        <CardFooter className="justify-center gap-3">
          <Button nativeButton={false} render={<Link href="/" />}>
            Back to home
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/products" />}
          >
            Browse products
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
