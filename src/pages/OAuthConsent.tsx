import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// The supabase.auth.oauth namespace is beta and may be missing from generated
// types — a minimal local typed wrapper avoids `any` leaks at call sites.
type OAuthResult = { redirect_url?: string; redirect_to?: string };
type AuthorizationDetails = OAuthResult & {
  client?: { name?: string };
};
interface OAuthNamespace {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
}
const oauth = (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Отсутствует authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        // Preserve the FULL consent URL so auth returns the user here.
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Сервер авторизации не вернул адрес перенаправления.");
      return;
    }
    window.location.href = target;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="kamp-card w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-kamp-accent">
            Подключение приложения
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-red-400 text-sm text-center">
              Не удалось загрузить запрос авторизации: {error}
            </p>
          )}
          {!error && !details && (
            <p className="text-center text-gray-400">Загрузка…</p>
          )}
          {details && (
            <>
              <p className="text-center text-muted-foreground">
                Разрешить приложению{" "}
                <span className="font-semibold text-foreground">
                  {details.client?.name ?? "внешнему клиенту"}
                </span>{" "}
                доступ к вашим данным КЭМП от вашего имени?
              </p>
              <div className="flex gap-3">
                <Button
                  className="kamp-button-primary flex-1"
                  disabled={busy}
                  onClick={() => decide(true)}
                >
                  Разрешить
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={busy}
                  onClick={() => decide(false)}
                >
                  Отклонить
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
