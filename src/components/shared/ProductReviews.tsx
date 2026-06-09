"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { notifySuccess, notifyError } from "@/lib/notify";

interface ReviewUser {
  id: string;
  name: string;
  image?: string | null;
}
interface Review {
  id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  createdAt: string;
  user: ReviewUser;
}

interface ProductReviewsProps {
  productId: string;
  avgRating: number;
  totalReviews: number;
}

function initials(name?: string | null): string {
  if (!name) return "U";
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("flex", className)}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            i < Math.round(value)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/40"
          )}
        />
      ))}
    </div>
  );
}

export function ProductReviews({
  productId,
  avgRating,
  totalReviews,
}: ProductReviewsProps) {
  const { isAuthenticated } = useAuth();

  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Write-review form state.
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // Fetch (and re-fetch after a submit via reloadKey). All setState lives inside
  // the async function so it isn't a synchronous setState in the effect body.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch(`/api/reviews?productId=${productId}&limit=50`);
        const json = res.ok ? await res.json() : null;
        if (!cancelled) setReviews(json?.data?.reviews ?? []);
      } catch {
        if (!cancelled) setReviews([]);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [productId, reloadKey]);

  // Rating breakdown from loaded reviews (5 → 1).
  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: (reviews ?? []).filter((r) => r.rating === star).length,
  }));
  const loadedTotal = reviews?.length ?? 0;

  async function submitReview() {
    if (rating < 1) {
      notifyError("Please select a rating");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productId,
          rating,
          title: title.trim() || undefined,
          body: body.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        notifyError("Couldn't submit review", json?.error);
        return;
      }
      notifySuccess("Review submitted", "Thanks for your feedback!");
      setOpen(false);
      setRating(0);
      setTitle("");
      setBody("");
      setReloadKey((k) => k + 1); // re-fetch the list
    } catch {
      notifyError("Couldn't submit review", "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="border-t border-border pt-10">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        Customer Reviews
      </h2>

      <div className="mt-6 grid gap-8 md:grid-cols-[240px_1fr]">
        {/* Summary + breakdown */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-semibold text-foreground">
              {avgRating.toFixed(1)}
            </span>
            <div>
              <Stars value={avgRating} />
              <p className="mt-0.5 text-xs text-muted-foreground">
                {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            {breakdown.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-muted-foreground">{star}</span>
                <Star className="size-3 fill-amber-400 text-amber-400" />
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-amber-400"
                    style={{
                      width: loadedTotal ? `${(count / loadedTotal) * 100}%` : "0%",
                    }}
                  />
                </div>
                <span className="w-6 text-right text-muted-foreground">
                  {count}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6">
            {isAuthenticated ? (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger render={<Button variant="outline" className="w-full" />}>
                  Write a review
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Write a review</DialogTitle>
                  </DialogHeader>

                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="mb-1.5 text-sm font-medium">Your rating</p>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            aria-label={`${i + 1} star${i ? "s" : ""}`}
                            onClick={() => setRating(i + 1)}
                          >
                            <Star
                              className={cn(
                                "size-6 transition-colors",
                                i < rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground/40 hover:text-amber-400"
                              )}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Title (optional)"
                      value={title}
                      maxLength={150}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                    <textarea
                      placeholder="Share your thoughts… (optional)"
                      value={body}
                      maxLength={5000}
                      rows={4}
                      onChange={(e) => setBody(e.target.value)}
                      className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />

                    <Button onClick={submitReview} disabled={submitting}>
                      {submitting && <Loader2 className="animate-spin" />}
                      Submit review
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <Button variant="outline" className="w-full" render={<Link href="/login?redirect=back" />} nativeButton={false}>
                Login to write a review
              </Button>
            )}
          </div>
        </div>

        {/* Review list */}
        <div>
          {reviews === null ? (
            <div className="flex flex-col gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No reviews yet — be the first to review this product.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {reviews.map((review) => (
                <li key={review.id} className="flex gap-3 py-4 first:pt-0">
                  <Avatar size="sm">
                    {review.user.image ? (
                      <AvatarImage src={review.user.image} alt={review.user.name} />
                    ) : null}
                    <AvatarFallback>{initials(review.user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {review.user.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Stars value={review.rating} className="mt-1" />
                    {review.title && (
                      <p className="mt-1.5 text-sm font-medium text-foreground">
                        {review.title}
                      </p>
                    )}
                    {review.body && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {review.body}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
