import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Вход в ЛК по номеру телефона + пароль.
// Телефон -> email аккаунта (поиск по profiles с service_role),
// затем обычный signInWithPassword. Email клиенту НЕ возвращается.

const normalizePhone = (raw: string): string | null => {
  let digits = (raw || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  if (!digits.startsWith("7")) digits = `7${digits}`;
  digits = digits.slice(0, 11);
  return digits.length === 11 ? digits : null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { phone, password } = await req.json();

    if (typeof phone !== "string" || typeof password !== "string" || password.length < 6) {
      return json({ error: "Введите телефон и пароль" }, 400);
    }

    const normalized = normalizePhone(phone);
    if (!normalized) {
      return json({ error: "Введите корректный номер телефона" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    // Ищем профиль по нормализованному номеру (форматы в базе разные)
    const { data: matches, error: lookupError } = await admin
      .from("profiles")
      .select("user_id, phone")
      .not("phone", "is", null);

    if (lookupError) {
      console.error("profile lookup error", lookupError);
      return json({ error: "Ошибка входа. Попробуйте ещё раз." }, 500);
    }

    const found = (matches ?? []).filter(
      (p: { phone: string | null }) => normalizePhone(p.phone ?? "") === normalized,
    );

    if (found.length === 0) {
      return json({ error: "Неверный телефон или пароль" }, 400);
    }
    if (found.length > 1) {
      return json(
        { error: "Этот номер привязан к нескольким аккаунтам. Обратитесь к администратору." },
        409,
      );
    }

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(
      found[0].user_id,
    );
    const email = userData?.user?.email;
    if (userError || !email) {
      return json({ error: "Неверный телефон или пароль" }, 400);
    }

    const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session) {
      return json({ error: "Неверный телефон или пароль" }, 400);
    }

    return json({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    });
  } catch (e) {
    console.error("phone-signin error", e);
    return json({ error: "Ошибка входа. Попробуйте ещё раз." }, 500);
  }
});
