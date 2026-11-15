import Link from "next/link";
import { Brand } from "./ui";

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-enamel/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-[1180px] items-center gap-4 px-4 lg:px-8">
        <Link
          href="/"
          aria-label="Minder, accueil"
          className="mr-auto rounded-lg"
        >
          <Brand />
        </Link>
        {children}
      </div>
    </header>
  );
}
