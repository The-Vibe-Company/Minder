import {beforeEach,expect,it,vi} from "vitest";
const m=vi.hoisted(()=>({session:vi.fn(),membership:vi.fn(),from:vi.fn(),signed:vi.fn(async(_db,items)=>items)}));
vi.mock("@/lib/api",()=>({
 route:(fn:unknown)=>fn, session:m.session,membership:m.membership,signed:m.signed,
 check:(e:unknown)=>{if(e)throw e;},uuid:{parse:()=>{}},ApiError:Error,
}));
vi.mock("@/lib/pagination",()=>import("./pagination"));
import {GET} from "../app/api/me/likes/route";
import {DELETE} from "../app/api/items/[id]/vote/route";
beforeEach(()=>{
 vi.clearAllMocks();
 m.session.mockResolvedValue({db:{from:m.from},user:{id:"guest"}});
});
it("returns signed published likes with list title and vote timestamp",async()=>{
 const votes={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),order:vi.fn().mockReturnThis(),range:vi.fn().mockResolvedValue({data:[{item_id:"item",updated_at:"today"}]})};
 const item={id:"item",title:"Chair",description:"Blue",photo_path:"list/photo",list_id:"list"};
 const query=(data:unknown)=>({select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),in:vi.fn().mockReturnThis(),order:vi.fn().mockReturnThis(),range:vi.fn().mockResolvedValue({data:[data]})});
 const items=query(item);
 m.from.mockReturnValueOnce(votes).mockReturnValueOnce(items).mockReturnValueOnce(query({id:"list",title:"Move"}));
 const response=await GET(new Request("https://example.test/api/me/likes"),{params:Promise.resolve({})});
 expect(await response.json()).toEqual({items:[{...item,list:{id:"list",title:"Move"},voted_at:"today"}]});
 expect(votes.eq).toHaveBeenCalledWith("user_id","guest");
 expect(votes.eq).toHaveBeenCalledWith("choice","yes");
 expect(items.eq).toHaveBeenCalledWith("status","published");
});
it("guest can delete only their own vote",async()=>{
 const lookup={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),single:vi.fn().mockResolvedValue({data:{list_id:"list"}})};
 const deletion={delete:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),error:null};
 m.from.mockReturnValueOnce(lookup).mockReturnValueOnce(deletion);
 const response=await DELETE(new Request("https://example.test/api/items/item/vote",{method:"DELETE"}),{params:Promise.resolve({id:"item"})});
 expect(await response.json()).toEqual({ok:true});
 expect(deletion.eq).toHaveBeenCalledWith("user_id","guest");
 expect(deletion.eq).toHaveBeenCalledWith("item_id","item");
 expect(m.membership).toHaveBeenCalledWith(expect.anything(),"list","guest");
});

it("batches 205 likes, preserves newest order, and omits RLS-hidden items/lists", async () => {
 const votes = Array.from({length:205}, (_,i)=>({item_id:String(i),updated_at:String(205-i)}));
 const item = (id:string)=>({id,title:id,photo_path:"list/"+id,list_id:id==="3"?"hidden":"list"});
 const queries: {table:string; ids:string[]; filters:unknown[][]}[]=[];
 m.from.mockImplementation((table:string)=>{
   const call={table,ids:[] as string[],filters:[] as unknown[][]};
   queries.push(call);
   const q={
     select:vi.fn().mockReturnThis(), order:vi.fn().mockReturnThis(),
     eq:vi.fn((...args:unknown[])=>{call.filters.push(args);return q;}),
     in:vi.fn((_key:string,ids:string[])=>{call.ids=ids;return q;}),
     range:vi.fn(async()=>{
       if(table==="votes")return {data:votes};
       if(table==="items")return {data:call.ids.filter(id=>id!=="2").reverse().map(item)};
       return {data:[{id:"list",title:"Move"}]};
     }),
   };
   return q;
 });
 const response=await GET(new Request("https://example.test/api/me/likes"),{params:Promise.resolve({})});
 const body=await response.json();
 expect(body.items.map((i:{id:string})=>i.id)).toEqual(votes.filter(v=>!["2","3"].includes(v.item_id)).map(v=>v.item_id));
 expect(queries.filter(q=>q.table==="items").map(q=>q.ids.length)).toEqual([100,100,5]);
 expect(queries.filter(q=>q.table==="lists")).toHaveLength(1);
 expect(queries.filter(q=>q.table==="items").every(q=>q.filters.some(f=>f[0]==="status"&&f[1]==="published"))).toBe(true);
 expect(m.signed).toHaveBeenCalledTimes(1);
});

it("does no item/list lookups for an empty likes collection",async()=>{
 const q={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),order:vi.fn().mockReturnThis(),range:vi.fn().mockResolvedValue({data:[]})};
 m.from.mockReturnValue(q);
 const response=await GET(new Request("https://example.test/api/me/likes"),{params:Promise.resolve({})});
 expect(await response.json()).toEqual({items:[]});
 expect(m.from).toHaveBeenCalledTimes(1);
});

it("rejects a failed item batch instead of returning partial likes",async()=>{
 const q={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),in:vi.fn().mockReturnThis(),order:vi.fn().mockReturnThis(),range:vi.fn()
   .mockResolvedValueOnce({data:[{item_id:"item",updated_at:"today"}]})
   .mockResolvedValueOnce({data:null,error:{message:"unavailable"}})};
 m.from.mockReturnValue(q);
 await expect(GET(new Request("https://example.test/api/me/likes"),{params:Promise.resolve({})})).rejects.toThrow("Unable to load complete results");
 expect(m.signed).not.toHaveBeenCalled();
});
