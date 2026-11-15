import { createClient } from "@/lib/supabase/browser";
import { request } from "./use-resource";
async function jpeg(file: File): Promise<Blob> {
 const bitmap=await createImageBitmap(file); const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement("canvas");canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
 const context=canvas.getContext("2d");if(!context)throw new Error("Conversion de photo indisponible.");context.fillStyle="white";context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Photo non prise en charge.")),"image/jpeg",0.85));
}
export async function uploadPhotos(listId:string,files:File[],progress:(message:string)=>void) {
 const supabase=createClient();
 for(let i=0;i<files.length;i++) {progress(`Photo ${i+1}/${files.length} : préparation et description…`); const blob=await jpeg(files[i]);const photoPath=`${listId}/${crypto.randomUUID()}.jpg`;
 const {error}=await supabase.storage.from("item-photos").upload(photoPath,blob,{contentType:"image/jpeg"});if(error)throw new Error("Impossible d’envoyer la photo.");
 const result=await request<{notice?:string}>(`/api/lists/${listId}/items`,"POST",{photoPath});if(result.notice)progress(result.notice);
 }
}
