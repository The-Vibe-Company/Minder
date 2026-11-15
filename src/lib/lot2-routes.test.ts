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
 const query=(data:unknown)=>({select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data})});
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
