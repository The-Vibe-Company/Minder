"use client";
import { useState } from "react";
export function useTask() {
 const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
 async function run(task:()=>Promise<void>) { setBusy(true);setMessage("");try {await task();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);} }
 return {busy,message,setMessage,run};
}
