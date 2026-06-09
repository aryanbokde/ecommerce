import type { ReactNode } from "react";

// Shared layout for static policy / info pages (Privacy, Terms, Returns,
// Shipping, Contact). Renders a clean, readable document with a titled header,
// "last updated" line, optional intro, and auto-numbered sections — without
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
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <header className="border-b border-border pb-6">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {updated}
        </p>
      </header>

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
  );
}
