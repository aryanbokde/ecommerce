import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <p className="text-7xl font-bold text-muted-foreground">404</p>
          <CardTitle className="mt-2">Page not found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button nativeButton={false} render={<Link href="/" />}>Back to home</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
