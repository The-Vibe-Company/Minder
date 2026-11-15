import {expect,it,vi} from "vitest";
import {displayName,onboardingPath} from "./profile";
import {removeListPhotos} from "./storage-cleanup";
import type {Client} from "./api";
it("validates first names without email addresses",()=>{
 expect(displayName.parse("  Stan ")).toBe("Stan");
 for (const input of [" ","a@b","x".repeat(41)]) expect(displayName.safeParse(input).success).toBe(false);
});
it("preserves joined list and query through onboarding",()=>{
 expect(onboardingPath("/lists/abc?view=all",false)).toBe("/welcome?next=%2Flists%2Fabc%3Fview%3Dall");
 expect(onboardingPath("/lists/abc",true)).toBeNull();
 expect(onboardingPath("/auth/callback?next=/lists/abc",false)).toBeNull();
});
it("enumerates before removal and removes in batches",async()=>{
 const list=vi.fn().mockResolvedValueOnce({data:Array.from({length:100},(_,i)=>({id:String(i),name:String(i)}))}).mockResolvedValueOnce({data:[{id:"last",name:"last"}]});
 const remove=vi.fn(async(paths:string[])=>({data:paths}));
 const db={storage:{from:()=>({list,remove})}} as unknown as Client;
 expect(await removeListPhotos(db,"list")).toBe(101);
 expect(list.mock.calls[1][1].offset).toBe(100);
 expect(remove.mock.calls.map(c=>c[0].length)).toEqual([100,1]);
 expect(list.mock.invocationCallOrder[1]).toBeLessThan(remove.mock.invocationCallOrder[0]);
});
it("stops on storage failure",async()=>{
 const list=vi.fn().mockResolvedValueOnce({data:Array.from({length:100},(_,i)=>({id:String(i),name:String(i)}))}).mockResolvedValueOnce({data:[{id:"last",name:"last"}]});
 const remove=vi.fn().mockResolvedValueOnce({error:{message:"failed"}}).mockResolvedValueOnce({data:[{}]});
 await expect(removeListPhotos({storage:{from:()=>({list,remove})}} as unknown as Client,"list")).rejects.toThrow("removal incomplete");
 expect(remove).toHaveBeenCalledTimes(1);
});


it("does not remove any photos when a later enumeration page fails",async()=>{
 const list=vi.fn().mockResolvedValueOnce({data:Array.from({length:100},(_,i)=>({id:String(i),name:String(i)}))}).mockResolvedValueOnce({error:{message:"failed"}});
 const remove=vi.fn();
 await expect(removeListPhotos({storage:{from:()=>({list,remove})}} as unknown as Client,"list")).rejects.toThrow("enumeration failed");
 expect(remove).not.toHaveBeenCalled();
});
it("rejects an incomplete removal response",async()=>{
 const list=vi.fn().mockResolvedValue({data:[{id:"photo",name:"photo"}]});
 const remove=vi.fn().mockResolvedValue({data:[]});
 await expect(removeListPhotos({storage:{from:()=>({list,remove})}} as unknown as Client,"list")).rejects.toThrow("removal incomplete");
});
