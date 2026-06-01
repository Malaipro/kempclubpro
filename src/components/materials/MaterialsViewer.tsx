import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, FileText, Lock, ExternalLink, Download, AlertCircle } from 'lucide-react';

interface Material {
  id: string;
  title: string;
  block_type: string;
  theme: string | null;
  content: string | null;
  file_url: string | null;
  link_url: string | null;
  status: 'open' | 'closed';
  stream_id: string | null;
  available_to: 'all' | 'intensive' | 'club';
  open_date: string | null;
  sort_order: number;
}

export const MaterialsViewer: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMaterials = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await (supabase as any)
        .from('materials')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaterials((data || []) as Material[]);
    } catch (e: any) {
      console.error('Error loading materials:', e);
      setError('Не удалось загрузить материалы');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={loadMaterials}>Повторить</Button>
        </CardContent>
      </Card>
    );
  }

  if (materials.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground" />
          <p className="text-muted-foreground">Материалы пока не добавлены</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          Материалы
        </h2>
        <p className="text-muted-foreground">Учебные и справочные материалы</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {materials.map((m) => {
          const isClosed = m.status === 'closed';
          return (
            <Card
              key={m.id}
              className={isClosed ? 'opacity-60 grayscale' : ''}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 shrink-0" />
                    {m.title}
                  </CardTitle>
                  {isClosed ? (
                    <Badge variant="secondary" className="shrink-0 gap-1">
                      <Lock className="w-3 h-3" /> Закрыто
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0">{m.block_type}</Badge>
                  )}
                </div>
                {m.theme && (
                  <p className="text-xs text-muted-foreground">{m.theme}</p>
                )}
              </CardHeader>
              {!isClosed && (
                <CardContent className="space-y-3">
                  {m.content && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{m.content}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {m.link_url && (
                      <Button asChild size="sm" variant="outline">
                        <a href={m.link_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-4 h-4 mr-1" /> Открыть ссылку
                        </a>
                      </Button>
                    )}
                    {m.file_url && (
                      <Button asChild size="sm" variant="outline">
                        <a href={m.file_url} target="_blank" rel="noreferrer">
                          <Download className="w-4 h-4 mr-1" /> Файл
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
