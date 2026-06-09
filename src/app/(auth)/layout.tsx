import { Bricolage_Grotesque, Jost } from "next/font/google";

const bricolage = Bricolage_Grotesque({
  weight: ["400", "600", "700", "800"],
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const jost = Jost({
  weight: ["300", "400", "500"],
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${bricolage.variable} ${jost.variable} contents`}>
      {children}
    </div>
  );
}
