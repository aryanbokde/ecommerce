import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface PageHeaderCrumb {
  label: string;
  /** When set, the crumb is a link; the last/active crumb usually omits this. */
  href?: string;
}

export interface PageHeaderProps {
  /** Large bold page title, e.g. "Shopping Cart". */
  title: string;
  /** Breadcrumb trail, e.g. [{label:"Home",href:"/"},{label:"Cart"}]. */
  breadcrumb: PageHeaderCrumb[];
  /** Optional icon shown inside the soft rounded tile beside the title. */
  icon?: LucideIcon;
  /** Optional subtle pill beside the title, e.g. "3 items", "248 products". */
  pill?: string;
  /** Optional muted line under the title. */
  subtitle?: string;
  /** Optional right-aligned slot (e.g. a sort button or filter). */
  action?: React.ReactNode;
}

/**
 * Shared page-header band — reuses the cart page's hero pattern across every
 * frontend page except home: breadcrumb row, soft rounded icon tile, bold
 * title, subtle context pill, all in a navy/surface band with a soft bottom
 * border. Presentation only; navigation is the sole behavior (breadcrumb links).
 */
export function PageHeader({
  title,
  breadcrumb,
  icon: Icon,
  pill,
  subtitle,
  action,
}: PageHeaderProps) {
  return (
    <div className="border-b border-border bg-gradient-to-b from-muted/50 to-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10 lg:px-8">
        {/* Breadcrumb — understated, blue on hover, last item bold/active */}
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumb.map((crumb, i) => {
              const isLast = i === breadcrumb.length - 1;
              return (
                <React.Fragment key={`${crumb.label}-${i}`}>
                  <BreadcrumbItem>
                    {isLast || !crumb.href ? (
                      <BreadcrumbPage className="font-semibold">
                        {crumb.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        className="hover:text-brand-blue"
                        render={<Link href={crumb.href} />}
                      >
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>

        {/* Title row — icon tile + title + pill, optional action pushed right */}
        <div className="mt-3 flex flex-wrap items-start gap-x-4 gap-y-3">
          <div className="flex min-w-0 items-center gap-3.5">
            {Icon && (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="size-6" />
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {title}
                </h1>
                {pill && (
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {pill}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>

          {action && (
            <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
              {action}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
