"use client";
import {useRef,useState} from "react";
import {request,useResource} from "@/hooks/use-resource";
import {useTask} from "@/hooks/use-task";
import {Item,Photo,Notice,ListNav} from "./ui";
export function Swipe({id}:{id:string}) {const {data,error,refresh}=useResource<{items:Item[]}>(`/api/lists/${id}/swipe`);const task=useTask();const [last,setLast]=useState<string>();const start=useRef<number|null>(null);const item=data?.items[0];
 function vote(choice:"yes"|"no") {if(!item||task.busy)return;void task.run(async()=>{await request(`/api/items/${item.id}/vote`,"POST",{choice});setLast(item.id);await refresh();});}
 return <><h1>À vous de choisir</h1><ListNav id={id}/><Notice>{error||task.message}</Notice>{item?<><article className="panel mx-auto max-w-md touch-pan-y select-none" onPointerDown={e=>{start.current=e.clientX;}} onPointerCancel={()=>{start.current=null;}} onPointerUp={e=>{if(start.current!==null){const delta=e.clientX-start.current;start.current=null;if(Math.abs(delta)>65)vote(delta>0?"yes":"no");}}}><Photo item={item}/><p className="my-4">{item.description||"Un objet à découvrir"}</p></article><p className="my-4">Glissez à droite pour le garder, à gauche pour passer.</p><div className="flex gap-4"><button disabled={task.busy} onClick={()=>vote("no")}>Non merci ←</button><button disabled={task.busy} onClick={()=>vote("yes")}>Je le veux →</button></div></>:data?<p>Tout est vu ! Revenez quand de nouveaux objets sont ajoutés.</p>:<p>Chargement…</p>}<button className="mt-5" disabled={!last||task.busy} onClick={()=>void task.run(async()=>{await request(`/api/items/${last}/vote`,"DELETE");setLast(undefined);await refresh();})}>Annuler mon dernier choix</button></>;
}
