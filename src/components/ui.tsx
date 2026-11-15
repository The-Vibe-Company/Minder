import Link from "next/link";
export function Notice({children}:{children:React.ReactNode}) {return children?<p role="status" className="my-4 rounded border border-stone-300 bg-white p-3">{children}</p>:null;}
export function ListNav({id}:{id:string}) {return <nav aria-label="Navigation de la liste" className="my-6 flex flex-wrap gap-4"><Link href={`/lists/${id}`}>Objets</Link><Link href={`/lists/${id}/swipe`}>Choisir</Link><Link href={`/lists/${id}/search`}>Rechercher</Link></nav>;}
export type Item={id:string;description:string|null;photoUrl?:string;yes?:{id:string;display_name:string|null}[];no?:{id:string;display_name:string|null}[]};
// Private signed URLs are short lived; native img avoids sending private URLs to an image optimizer.
export function Photo({item}:{item:Item}) {return item.photoUrl? <img src={item.photoUrl} alt={item.description||"Objet à découvrir"} className="aspect-square w-full rounded object-contain bg-white" />:<p>Photo indisponible</p>;}
