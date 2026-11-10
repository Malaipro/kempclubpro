// STAGED replacement for the EXISTING send-push-notification entrypoint.
// No user_ids/default-all fallback; forwards only explicit audience to the protected orchestrator.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@4';
const Schema=z.object({audience:z.enum(['resident','intensive','all']),request_id:z.string().uuid(),title:z.string().min(1).max(100),body:z.string().min(1).max(1000),url:z.string().max(300)}).strict();
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return reply({ok:false,error:'method_not_allowed'},405);
  const authorization=req.headers.get('Authorization');
  if(!authorization?.startsWith('Bearer '))return reply({ok:false,error:'unauthorized'},401);
  let input:unknown;try{input=await req.json();}catch{return reply({ok:false,error:'invalid_json'},400);}
  const p=Schema.safeParse(input);if(!p.success)return reply({ok:false,error:'explicit_audience_and_request_id_required'},400);
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_ANON_KEY');
  if(url!=='https://wfjvjvbjjxcgkaolkgdq.supabase.co' || !key)return reply({ok:false,error:'wrong_target'},503);
  try {
    const result=await fetch(`${url}/functions/v1/dispatch-club-notification`,{method:'POST',headers:{Authorization:authorization,apikey:key,'Content-Type':'application/json'},body:JSON.stringify({...p.data,operation:'send',channels:['push']}),signal:AbortSignal.timeout(55000)});
    return new Response(await result.text(),{status:result.status,headers:{...corsHeaders,'Content-Type':'application/json'}});
  }catch{return reply({ok:false,error:'dispatch_uncertain_do_not_retry_with_new_id'},502);}
});