import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Mug } from "@/components/ui";

export const metadata: Metadata = { title: "Page introuvable" };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main
        id="contenu"
        className="toile min-h-[calc(100dvh-65px)] px-4 py-10 lg:py-20"
      >
        <div className="mx-auto max-w-[480px] rounded-[28px] bg-enamel p-7 text-center shadow-[0_24px_40px_-24px_rgba(18,26,58,.55)] lg:p-10">
          <p className="kicker">Erreur 404</p>
          <Mug className="mt-4" />
          <h1 className="mt-3 text-[34px] font-extrabold">
            Cette page a déjà déménagé
          </h1>
          <p className="mt-3 text-[17px] text-muted">
            Ou elle n’a jamais existé. L’adresse est peut-être incomplète : un
            lien coupé en deux dans un e-mail, ça arrive.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/" className="btn">
              Retour à l’accueil
            </Link>
            <Link href="/lists" className="btn btn-ghost">
              Mes listes
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
