// Re-export the single Prisma client instance from @/server/db so legacy
// `@/lib/db` imports keep working. One client for the whole app (no second pool).
export { default } from "@/server/db";
