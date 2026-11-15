import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
export default async function Home() {
 if(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY){const supabase=await createClient();const {data}=await supabase.auth.getUser();if(data.user)redirect("/lists");}
 return <section className="py-16 max-w-xl"><p className="uppercase tracking-widest text-sm">Une maison, mille souvenirs</p><h1 className="my-6 text-5xl">Les objets changent de maison. Les souvenirs restent.</h1><p className="text-xl leading-relaxed">Photographiez les objets de famille, invitez vos proches et laissez chacun choisir ce qu’il aimerait garder.</p><Link className="inline-block mt-8 underline text-xl" href="/login">Se retrouver sur Minder →</Link></section>;
}
