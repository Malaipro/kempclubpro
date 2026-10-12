import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, ScrollText } from 'lucide-react';

type Codex = { title: string | null; content: string | null } | null;

const useCodex = () => {
  const [codex, setCodex] = useState<Codex>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (supabase as any).from('platform_documents').select('title, content')
      .eq('doc_type', 'codex_resident').eq('is_active', true)
      .order('updated_at', { ascending: false }).limit(1)
      .then(({ data }: any) => { setCodex(data?.[0] ?? null); setLoading(false); });
  }, []);
  return { codex, loading };
};

const CodexBody: React.FC<{ content: string }> = ({ content }) => (
  <div className="space-y-3 text-sm leading-relaxed [&_h1]:text-lg [&_h2]:text-base [&_h1]:font-bold [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-primary [&_a]:underline"
    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(content, { async: false }) as string) }} />
);

export const WebCodexView: React.FC = () => {
  const { codex, loading } = useCodex();
  return (
    <div>
      <div className="app-section-header"><h1 className="flex items-center gap-2"><ScrollText className="h-6 w-6" />Кодекс КЭМП</h1></div>
      <div className="p-4">
        {loading ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          : codex?.content ? <div className="bg-card rounded-lg border p-4"><CodexBody content={codex.content} /></div>
          : <p className="text-center text-muted-foreground">Кодекс будет доступен позже</p>}
      </div>
    </div>
  );
};

export const CodexAcceptModal: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const { codex, loading } = useCodex();

  useEffect(() => {
    if (!user) return;
    (supabase as any).from('profiles').select('codex_accepted_at').eq('user_id', user.id).maybeSingle()
      .then(({ data }: any) => { if (data && !data.codex_accepted_at) setOpen(true); });
  }, [user]);

  if (loading) return null;
  const hasCodex = !!codex?.content;

  const confirm = async () => {
    setSaving(true);
    const { error } = await (supabase.rpc as any).call(supabase, 'accept_codex_web');
    setSaving(false);
    if (!error) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !hasCodex) setOpen(false); }}>
      <DialogContent className="web-app-theme app-glass-dialog text-foreground"
        onInteractOutside={(e) => hasCodex && e.preventDefault()} onEscapeKeyDown={(e) => hasCodex && e.preventDefault()}>
        <DialogHeader><DialogTitle>Кодекс КЭМП</DialogTitle></DialogHeader>
        {hasCodex ? (
          <>
            <div className="max-h-[50dvh] overflow-y-auto pr-1"><CodexBody content={codex!.content!} /></div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} />
              Принимаю Кодекс КЭМП
            </label>
            <Button disabled={!checked || saving} onClick={confirm}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}Подтвердить
            </Button>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">Кодекс будет доступен позже</p>
            <Button variant="outline" onClick={() => setOpen(false)}>Продолжить</Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
