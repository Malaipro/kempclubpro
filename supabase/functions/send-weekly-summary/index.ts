import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: isAdmin } = await admin.rpc("is_admin", {
      _user_id: claims.claims.sub,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { summary_id } = await req.json();
    if (!summary_id) {
      return new Response(JSON.stringify({ error: "summary_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: summary, error: sErr } = await admin
      .from("weekly_summaries")
      .select("id, user_id, week_start, summary_text, edited_text, status")
      .eq("id", summary_id)
      .single();
    if (sErr || !summary) throw sErr ?? new Error("Summary not found");

    const { data: profile, error: pErr } = await admin
      .from("profiles")
      .select("telegram_id")
      .eq("user_id", summary.user_id)
      .single();
    if (pErr || !profile?.telegram_id) {
      throw new Error("У участника не привязан Telegram");
    }

    const text = summary.edited_text ?? summary.summary_text;

    const tgRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: profile.telegram_id,
          text: `📋 Сводка недели\n\n${text}`,
        }),
      },
    );

    if (!tgRes.ok) {
      const errBody = await tgRes.text();
      throw new Error(`Telegram error ${tgRes.status}: ${errBody}`);
    }

    const { error: uErr } = await admin
      .from("weekly_summaries")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", summary_id);
    if (uErr) throw uErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-weekly-summary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
