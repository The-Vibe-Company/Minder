import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { Soupiere } from "@/components/art";
import { IconArrow, IconHeart, IconX } from "@/components/icons";

const steps = [
  {
    n: "1",
    title: "Muriel photographie",
    text: "Une pièce après l’autre, toutes les photos d’un coup. La description s’écrit presque toute seule, et se corrige d’un doigt.",
  },
  {
    n: "2",
    title: "La famille swipe",
    text: "À droite, « je le veux ». À gauche, « non merci ». On peut changer d’avis, et retrouver la lampe du bureau en la cherchant.",
  },
  {
    n: "3",
    title: "On fait les comptes",
    text: "Le récap montre qui veut quoi. Quand trois personnes veulent la soupière, on en parle au déjeuner.",
  },
];

export default async function Home() {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/lists");
  }
  return (
    <>
      <SiteHeader>
        <Link href="/login" className="btn btn-ghost btn-sm">
          Se connecter
        </Link>
      </SiteHeader>
      <main id="contenu">
        <section className="toile">
          <div className="mx-auto grid max-w-[1180px] items-center gap-8 px-4 py-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:px-8 lg:py-20">
            <div className="rise rounded-[28px] bg-enamel p-6 shadow-[0_24px_40px_-24px_rgba(18,26,58,.55)] lg:p-10">
              <p className="kicker">La maison est vendue</p>
              <h1 className="mt-4 mb-4 text-[40px] font-extrabold lg:text-[60px]">
                Les objets s’en vont. On se les partage.
              </h1>
              <p className="text-[18px] text-muted lg:text-[20px]">
                Muriel photographie la soupière, le buffet, la boîte à boutons.
                Chacun dit « je le veux » ou « non merci » du bout du pouce, et
                personne ne se fâche au moment de charger le camion.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href="/login" className="btn">
                  Commencer
                  <IconArrow />
                </Link>
                <p className="text-[14px] text-muted">
                  Une invitation reçue ? Ouvrez simplement son lien.
                </p>
              </div>
            </div>
            <div
              className="relative mx-auto w-full max-w-[380px]"
              aria-hidden="true"
            >
              <div className="absolute inset-0 translate-y-2 rotate-3 rounded-[30px] bg-enamel shadow-[0_0_0_2px_var(--color-line)]" />
              <div className="relative -rotate-2 rounded-[30px] bg-enamel p-2.5 shadow-[0_18px_30px_-12px_rgba(18,26,58,.45)]">
                <div className="overflow-hidden rounded-[20px]">
                  <Soupiere className="block aspect-[4/3] w-full" />
                </div>
                <div className="px-2 pt-3 pb-2">
                  <p className="font-display text-[22px] font-bold leading-tight">
                    Soupière en faïence de Quimper
                  </p>
                  <p className="mt-1 text-[15px] text-muted">
                    Fleurs bleues, une petite ébréchure au couvercle.
                  </p>
                </div>
              </div>
              <div className="relative mt-5 flex justify-center gap-10">
                <span className="token token-no">
                  <IconX size={26} />
                  Non merci
                </span>
                <span className="token token-yes">
                  <IconHeart size={26} />
                  Je le veux
                </span>
              </div>
            </div>
          </div>
        </section>
        <div className="toile-band" aria-hidden="true" />
        <section className="mx-auto max-w-[1180px] px-4 py-14 lg:px-8 lg:py-20">
          <h2 className="text-[30px] font-bold lg:text-[40px]">
            Comment ça se passe
          </h2>
          <ol className="mt-8 grid gap-5 lg:grid-cols-3">
            {steps.map((s) => (
              <li
                key={s.n}
                className="rounded-[22px] bg-white p-6 shadow-[0_0_0_1.5px_var(--color-line)]"
              >
                <span className="plate" aria-hidden="true">
                  {s.n}
                </span>
                <h3 className="mt-5 text-[22px] font-bold">{s.title}</h3>
                <p className="mt-2 text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <footer className="border-t border-line">
        <p className="mx-auto max-w-[1180px] px-4 py-6 text-[14px] text-muted lg:px-8">
          Minder, pour la famille. Rien n’est vendu ici : on se partage.
        </p>
      </footer>
    </>
  );
}
