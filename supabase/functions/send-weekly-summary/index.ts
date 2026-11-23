import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { notifyUser } from "../_shared/appNotify.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {

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

    const text = summary.edited_text ?? summary.summary_text;
    // Personal summaries are delivered in the app (bell + push), not Telegram.
    const r = await notifyUser(admin, summary.user_id, { title: "Сводка недели", body: text, url: "/app?section=journal", type: "weekly_summary" });
    if (!r.stored) throw new Error("Не удалось сохранить уведомление");

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
