import React, { useEffect, useState } from 'react';
import { ScrollText, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const SERVER_URL = import.meta.env.VITE_TELEGRAM_SERVER_URL ?? 'https://tg.kempclub.pro';

// ---------- Types ----------

interface RuleDocument {
  doc_type: 'rules_intensive' | 'rules_captain' | 'codex_resident';
  title: string;
  content: string | null;
  file_url: string | null;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: RuleDocument[] };

interface Props {
  onBack: () => void;
}

// ---------- Markdown → HTML (базовый набор: заголовки, списки, жирный/курсив, ссылки) ----------

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function markdownToHtml(markdown: string): string {
  const blocks = markdown.trim().split(/\n{2,}/);

  return blocks
    .map((block) => {
      const lines = block.split('\n').filter((line) => line.trim().length > 0);
      if (lines.length === 0) return '';

      const headingMatch = lines[0].match(/^(#{1,3})\s+(.*)$/);
      if (headingMatch && lines.length === 1) {
        const level = headingMatch[1].length;
        return `<h${level}>${inlineMarkdown(headingMatch[2])}</h${level}>`;
      }

      const isUnorderedList = lines.every((line) => /^[-*]\s+/.test(line));
      if (isUnorderedList) {
        const items = lines.map((line) => `<li>${inlineMarkdown(line.replace(/^[-*]\s+/, ''))}</li>`).join('');
        return `<ul>${items}</ul>`;
      }

      const isOrderedList = lines.every((line) => /^\d+\.\s+/.test(line));
      if (isOrderedList) {
        const items = lines.map((line) => `<li>${inlineMarkdown(line.replace(/^\d+\.\s+/, ''))}</li>`).join('');
        return `<ol>${items}</ol>`;
      }

      return `<p>${lines.map(inlineMarkdown).join('<br/>')}</p>`;
    })
    .join('');
}

// ---------- View ----------

export const TelegramRulesView: React.FC<Props> = ({ onBack }) => {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });

  // Telegram BackButton — показываем при маунте, скрываем при размонтировании
  useEffect(() => {
    const btn = window.Telegram?.WebApp?.BackButton;
    if (!btn) return;
    btn.show();
    btn.onClick(onBack);
    return () => {
      btn.offClick(onBack);
      btn.hide();
    };
  }, [onBack]);

  // Загрузка документов
  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      setLoadState({ status: 'error', message: 'Нет доступа к Telegram WebApp' });
      return;
    }

    fetch(`${SERVER_URL}/api/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: 'get_rules' }),
    })
      .then(async (res) => {
        const body = await res.json() as { ok: boolean; data?: { documents: RuleDocument[] }; error?: string };
        if (!body.ok || !body.data) throw new Error(body.error ?? 'rpc_error');
        return body.data.documents;
      })
      .then((documents) => setLoadState({ status: 'ok', data: documents }))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Ошибка загрузки';
        setLoadState({ status: 'error', message: msg });
      });
  }, []);

  // ---------- Render: loading ----------
  if (loadState.status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Загрузка правил...</p>
      </div>
    );
  }

  // ---------- Render: error ----------
  if (loadState.status === 'error') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-6">
        <p className="text-destructive text-sm text-center">{loadState.message}</p>
        <Button size="sm" variant="outline" onClick={onBack}>Назад</Button>
      </div>
    );
  }

  const documents = loadState.data;

  return (
    <div className="min-h-screen bg-background pb-8">

      {/* Header */}
      <div className="bg-kamp-primary px-4 pt-8 pb-6 flex flex-col items-center gap-1">
        <h1 className="text-white text-xl font-bold">Правила</h1>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {documents.map((doc) => (
          <Card key={doc.doc_type}>
            <CardContent className="py-4 px-4">
              <h2 className="text-base font-bold mb-3">{doc.title}</h2>

              {doc.content && (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(doc.content) }}
                />
              )}

              {doc.file_url && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 gap-1.5"
                  onClick={() => window.Telegram?.WebApp?.openLink(doc.file_url!)}
                >
                  <FileText className="w-4 h-4" />
                  Открыть файл
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        {documents.length === 0 && (
          <Card>
            <CardContent className="py-8 px-4 text-center">
              <ScrollText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Правила пока не добавлены</p>
            </CardContent>
          </Card>
        )}
      </div>

    </div>
  );
};
