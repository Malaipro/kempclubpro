import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";
import { corsHeaders } from "../_shared/cors.ts";

const MODEL = "claude-sonnet-4-6";

const BASE_SYSTEM_PROMPT = `Ты Макс — нутрициолог для спортсменов клуба КЭМП.
Отвечаешь по питанию, рецептам, БЖУ, добавкам.
Тон: дружелюбный, профессиональный, мужской.
Учитывай рост/вес участника если известны.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
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
    const userId = claims?.claims?.sub;
    if (!userId) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) {
      return json({ error: "message required" }, 400);
    }

    const history: ChatMessage[] = Array.isArray(body?.history)
      ? body.history
        .filter(
          (m: unknown): m is ChatMessage =>
            !!m &&
            typeof m === "object" &&
            typeof (m as ChatMessage).content === "string" &&
            ((m as ChatMessage).role === "user" ||
              (m as ChatMessage).role === "assistant"),
        )
        .slice(-20)
        .map((m: ChatMessage) => ({ role: m.role, content: m.content }))
      : [];

    // История должна начинаться с сообщения пользователя
    while (history.length && history[0].role !== "user") history.shift();

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from("profiles")
      .select("first_name, display_name, height_cm, weight_kg")
      .eq("user_id", userId)
      .maybeSingle();

    const facts: string[] = [];
    const name = profile?.first_name ?? profile?.display_name;
    if (name) facts.push(`Имя: ${name}`);
    if (profile?.height_cm) facts.push(`Рост: ${profile.height_cm} см`);
    if (profile?.weight_kg) facts.push(`Вес: ${profile.weight_kg} кг`);

    const system = facts.length
      ? `${BASE_SYSTEM_PROMPT}\n\nДанные участника:\n${facts.join("\n")}`
      : BASE_SYSTEM_PROMPT;

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system,
      messages: [...history, { role: "user", content: message }],
    });

    const reply = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { text: string }).text)
      .join("\n")
      .trim();

    if (!reply) throw new Error("Пустой ответ от Claude API");

    return json({ reply });
  } catch (e) {
    console.error("nutrition-chat error:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
