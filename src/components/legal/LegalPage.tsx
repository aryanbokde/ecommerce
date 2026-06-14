import type { ReactNode } from "react";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

// Shared layout for static policy / info pages (Privacy, Terms, Returns,
// Shipping, Contact). Renders the shared PageHeader band, then a clean,
// readable document with optional intro and auto-numbered sections — without
// needing the Tailwind typography plugin (not installed in this project).

export interface LegalSection {
  heading: string;
  body: ReactNode;
}

interface LegalPageProps {
  title: string;
  updated: string;
  intro?: ReactNode;
  sections: LegalSection[];
}

export function LegalPage({ title, updated, intro, sections }: LegalPageProps) {
  return (
    <>
      <PageHeader
        title={title}
        breadcrumb={[{ label: "Home", href: "/" }, { label: title }]}
        icon={FileText}
        subtitle={`Last updated: ${updated}`}
      />
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      {intro && (
        <div className="mt-6 space-y-3 text-[15px] leading-7 text-muted-foreground">
          {intro}
        </div>
      )}

      <div className="mt-8 space-y-9">
        {sections.map((s, i) => (
          <section key={s.heading}>
            <h2 className="text-lg font-semibold text-foreground">
              {i + 1}. {s.heading}
            </h2>
            <div className="mt-2 space-y-3 text-[15px] leading-7 text-muted-foreground">
              {s.body}
            </div>
          </section>
        ))}
      </div>
      </div>
    </>
  );
}
