// STAGED ONLY. Copy with policy.ts and dispatch.ts into ONE approved Edge function release.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@4';
import webpush from 'npm:web-push@3.6.7';
import { FOUNDER_ID, requireFounder, recipientIds, requireRecipients, safePushUrl, trustedPushEndpoint, deliverSubscriptions } from './policy.ts';
import { dispatchChannels, type ChannelResult } from './dispatch.ts';

const respond = (body: unknown, status=200) => new Response(JSON.stringify(body), {status,headers:{...corsHeaders,'Content-Type':'application/json'}});
const ButtonSchema = z.object({id:z.string().uuid(),label:z.string().min(1).max(100),type:z.enum(['url','checkin','book_event','request_reward']),url:z.string().url().optional(),target_id:z.string().uuid().optional()}).strict();
const RequestSchema = z.object({
  operation:z.enum(['preview','send']), audience:z.enum(['resident','intensive','all']),
  request_id:z.string().uuid().optional(), channels:z.array(z.enum(['telegram_personal','telegram_group','push'])).min(1).max(3).optional(),
  text:z.string().max(4000).optional(), title:z.string().max(100).optional(), body:z.string().max(1000).optional(),
  url:z.string().max(300).optional(), topic_id:z.union([z.literal(304),z.literal(13),z.literal(4),z.literal(12)]).nullable().optional(),
  buttons:z.array(ButtonSchema).max(10).optional(), file_url:z.string().max(300).nullable().optional(),
}).strict();

Deno.serve(async req => {
  if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST') return respond({ok:false,error:'method_not_allowed'},405);
  const url=Deno.env.get('SUPABASE_URL'), anon=Deno.env.get('SUPABASE_ANON_KEY'), service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url || !anon || !service || !url.startsWith('https://wfjvjvbjjxcgkaolkgdq.supabase.co')) return respond({ok:false,error:'wrong_or_unconfigured_target'},503);
  const authorization=req.headers.get('Authorization');
  if(!authorization?.startsWith('Bearer ')) return respond({ok:false,error:'unauthorized'},401);
  const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}}});
  const db=createClient(url,service);
  const {data:auth,error:authError}=await caller.auth.getUser();
  if(authError || !auth.user) return respond({ok:false,error:'unauthorized'},401);
  const {data:profile,error:profileError}=await db.from('profiles').select('approved').eq('user_id',auth.user.id).maybeSingle();
  const {data:role,error:roleError}=await db.rpc('is_super_admin',{_user_id:auth.user.id});
  try {requireFounder(auth.user.id, !roleError && role===true, !profileError && profile?.approved===true);} catch {return respond({ok:false,error:'forbidden'},403);}
  let input: unknown; try {input=await req.json();} catch{return respond({ok:false,error:'invalid_json'},400);}
  const parsed=RequestSchema.safeParse(input);
  if(!parsed.success) return respond({ok:false,error:'invalid_request'},400);
  const p=parsed.data;
  try {
    // Paginate; never rely on PostgREST's default 1000-row window.
    const profiles: {user_id:string;approved:boolean;participant_status:string;telegram_id:string|null}[]=[];
    for(let offset=0;;offset+=500) {
      let query=db.from('profiles').select('user_id,approved,participant_status,telegram_id').eq('approved',true).order('user_id').range(offset,offset+499);
      if(p.audience==='resident')query=query.eq('participant_status','club_resident');
      if(p.audience==='intensive')query=query.eq('participant_status','intensive_active');
      const {data,error}=await query; if(error)throw new Error('audience_read_failed');
      profiles.push(...(data??[])); if(!data || data.length<500)break;
    }
    const ids=recipientIds(p.audience,profiles);
    const subscriptions: {id:string;user_id:string;endpoint:string;p256dh:string;auth:string}[]=[];
    for(let offset=0;offset<ids.length;offset+=100) {
      for(let row=0;;row+=500) {
        const {data,error}=await db.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').in('user_id',ids.slice(offset,offset+100)).order('id').range(row,row+499);
        if(error)throw new Error('subscription_read_failed'); subscriptions.push(...(data??[]));if(!data || data.length<500)break;
      }
    }
    const counts={selected:ids.length,subscribers:new Set(subscriptions.map(s=>s.user_id)).size,subscriptions:subscriptions.length,telegram_recipients:profiles.filter(p=>p.telegram_id).length};
    if(p.operation==='preview') return respond({ok:true,...counts});
    if(!p.request_id || !p.channels || new Set(p.channels).size!==p.channels.length) return respond({ok:false,error:'invalid_request'},400);
    const channels=p.channels;
    if(channels.includes('push') && (!p.title?.trim() || !p.body?.trim() || !p.url))return respond({ok:false,error:'push_fields_required'},400);
    if(channels.some(c=>c!=='push') && !p.text?.trim())return respond({ok:false,error:'text_required'},400);
    const pushUrl=safePushUrl(p.url??'/app');
    if(channels.includes('telegram_personal') || channels.includes('push'))requireRecipients(ids);
    const publicKey=Deno.env.get('VAPID_PUBLIC_KEY'),privateKey=Deno.env.get('VAPID_PRIVATE_KEY');
    if(channels.includes('push') && (!publicKey || !privateKey))return respond({ok:false,error:'push_not_configured'},503);
    // Claim uses a payload fingerprint: reusing request_id with altered content is forbidden.
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(p))))).map(b=>b.toString(16).padStart(2,'0')).join('');
    const {error:insertError}=await db.from('notification_dispatches').insert({request_id:p.request_id,created_by:FOUNDER_ID,payload_hash:hash});
    if(insertError && insertError.code!=='23505')throw new Error('claim_failed');
    const {data:dispatch,error:readError}=await db.from('notification_dispatches').select('payload_hash,created_by').eq('request_id',p.request_id).single();
    if(readError || dispatch.payload_hash!==hash || dispatch.created_by!==auth.user.id)return respond({ok:false,error:'request_id_conflict'},409);
    const invoke=async(name:string,body:unknown)=>{
      const res=await fetch(`${url}/functions/v1/${name}`,{method:'POST',headers:{Authorization:authorization,apikey:anon,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
      const data=await res.json().catch(()=>null);
      if(!res.ok || data?.ok===false || data?.data?.ok===false)throw new Error('telegram_delivery_failed');return data;
    };
    const results=await dispatchChannels(channels,{
      claim:async channel=>{const {error}=await db.from('notification_channel_claims').insert({request_id:p.request_id,channel}); if(error?.code==='23505')return false;if(error)throw new Error('claim_failed');return true;},
      previous:async channel=>{const {data,error}=await db.from('notification_channel_claims').select('result').eq('request_id',p.request_id).eq('channel',channel).single();if(error)throw new Error('claim_read_failed');return data.result as ChannelResult|null;},
      save:async(channel,result)=>{const {error}=await db.from('notification_channel_claims').update({result}).eq('request_id',p.request_id).eq('channel',channel);if(error)throw new Error('report_save_failed');},
      deliver:async channel=>{
        if(channel==='push') {
          if(!publicKey || !privateKey)throw new Error('push_not_configured');
          webpush.setVapidDetails('https://kemp-app.ru',publicKey,privateKey);
          const report=await deliverSubscriptions(subscriptions,async sub=>{
            if(!trustedPushEndpoint(sub.endpoint))throw new Error('untrusted_push_endpoint');
            await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title:p.title,body:p.body,url:pushUrl,tag:p.request_id}),{TTL:3600,timeout:10000});
          },async id=>{const {error}=await db.from('push_subscriptions').delete().eq('id',id);if(error)throw new Error('cleanup_failed');});
          return {ok:report.errors===0,selected:ids.length,...report};
        }
        if(channel==='telegram_group') {
          const telegram=await invoke('send-to-group',{group_text:p.text,topic_id:p.topic_id??null,group_buttons:(p.buttons??[]).map(b=>({...b,schedule_id:b.type==='book_event'?b.target_id:undefined}))});
          return {ok:true,selected:0,telegram}; // Group membership count is unknown.
        }
        const tgIds=profiles.filter(p=>p.telegram_id).map(p=>p.user_id);
        if(!tgIds.length)return {ok:true,selected:ids.length,telegram:{sent:0}}; // Never empty targets => all fallback in legacy bot.
        const {data:broadcast,error}=await db.from('broadcast_messages').insert({text:p.text,audience:p.audience,buttons:p.buttons??[],file_url:p.file_url??null,status:'draft',recipients_count:0,created_by:auth.user.id,target_user_ids:tgIds}).select('id').single();
        if(error || !broadcast)throw new Error('broadcast_create_failed');
        const telegram=await invoke('send-broadcast',{broadcastId:broadcast.id});return {ok:true,selected:ids.length,telegram};
      },
    });
    return respond({ok:true,counts,results});
  } catch(e) {
    // Never include endpoints, subscription keys, tokens, or personal message text in logs/responses.
    const allowed=['empty_or_invalid_recipients','invalid_push_url','audience_read_failed','subscription_read_failed'];
    const message=e instanceof Error?e.message:'';
    return respond({ok:false,error:allowed.includes(message)?message:'dispatch_failed_or_uncertain'},400);
  }
});