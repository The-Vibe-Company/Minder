import {Suspense} from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {Logout} from "@/components/login";
import "./globals.css";
export const metadata: Metadata = {title:"Minder — les objets de famille",description:"Partagez les objets et les souvenirs en famille."};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>) {return <html lang="fr"><body><header className="mx-auto max-w-5xl px-5 py-6 flex flex-wrap gap-5 items-center border-b border-stone-300"><Link href="/" className="text-3xl font-serif mr-auto">Minder</Link><Link href="/lists">Mes listes</Link><Logout/></header><main className="mx-auto max-w-5xl px-5 py-10"><Suspense fallback={<p>Chargement…</p>}>{children}</Suspense></main></body></html>;}
