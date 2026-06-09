import type { ReactNode } from "react";
import { AdminPageHeader } from "./AdminPageHeader";

interface DashboardShellProps {
  title: string;
  description?: string;
  /** Optional right-aligned action, e.g. an "Add Product" button. */
  action?: ReactNode;
  children: ReactNode;
}

// Consistent heading + padding + max-width wrapper for every admin page.
export function DashboardShell({
  title,
  description,
  action,
  children,
}: DashboardShellProps) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <AdminPageHeader title={title} description={description} action={action} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
