import type { Client } from "@/lib/api";
// Snapshot all names before deleting: offset pagination while deleting skips objects.
export async function removeListPhotos(db: Client, listId: string) {
  const bucket = db.storage.from("item-photos");
  const paths: string[] = [];
  const folders = [listId];
  for (const folder of folders) {
    for (let offset = 0; ; offset += 100) {
      const {data,error} = await bucket.list(folder,{limit:100,offset,sortBy:{column:"name",order:"asc"}});
      if (error || !data) throw new Error("List photo enumeration failed");
      for (const entry of data ?? []) {
        const path = `${folder}/${entry.name}`;
        if (entry.id) paths.push(path); else folders.push(path);
      }
      if (!data || data.length < 100) break;
    }
  }
  let removed = 0;
  for (let offset = 0; offset < paths.length; offset += 100) {
    const {data,error} = await bucket.remove(paths.slice(offset,offset+100));
    if (error || !data || data.length !== Math.min(100, paths.length - offset))
      throw new Error("List photo removal incomplete");
    removed += data.length;
  }
  return removed;
}
