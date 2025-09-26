import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, BookOpen, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContentBlock {
  id: string;
  block_key: string;
  title?: string;
  content?: string;
  image_url?: string;
  metadata: any;
  is_active: boolean;
  created_at: string;
}

const INSTRUCTION_BLOCKS = [
  { key: 'kamp_instructions_title', name: 'Заголовок инструкции', category: 'instructions' },
  { key: 'kamp_instructions_subtitle', name: 'Подзаголовок инструкции', category: 'instructions' },
  { key: 'kamp_gamification_why', name: 'Зачем геймификация', category: 'instructions' },
  { key: 'kamp_bracelet_info', name: 'Информация о браслете', category: 'instructions' },
  { key: 'kamp_quick_rules', name: 'Быстрые правила', category: 'instructions' },
  { key: 'kamp_roles_info', name: 'Описание ролей', category: 'instructions' },
  { key: 'kamp_special_totems', name: 'Особые тотемы', category: 'instructions' },
];

const MANUAL_BLOCKS = [
  { key: 'kamp_manual_title', name: 'Заголовок руководства', category: 'manual' },
  { key: 'kamp_manual_subtitle', name: 'Подзаголовок руководства', category: 'manual' },
  { key: 'kamp_manual_important', name: 'Важное сообщение', category: 'manual' },
  { key: 'kamp_manual_db_structure', name: 'Структура БД', category: 'manual' },
  { key: 'kamp_manual_activities', name: 'Как заполнять активности', category: 'manual' },
  { key: 'kamp_manual_totems', name: 'Автоматический расчет тотемов', category: 'manual' },
  { key: 'kamp_manual_roles', name: 'Роли и ответственности', category: 'manual' },
  { key: 'kamp_manual_multipliers', name: 'Множители', category: 'manual' },
];

const ALL_BLOCKS = [...INSTRUCTION_BLOCKS, ...MANUAL_BLOCKS];

export const InstructionsManagement: React.FC = () => {
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ContentBlock | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    block_key: '',
    title: '',
    content: '',
    is_active: true,
  });

  useEffect(() => {
    fetchContentBlocks();
  }, []);

  const fetchContentBlocks = async () => {
    setLoading(true);
    try {
      const keys = ALL_BLOCKS.map(block => block.key);
      const { data, error } = await supabase
        .from('content_blocks')
        .select('*')
        .in('block_key', keys)
        .order('block_key');

      if (error) throw error;
      setContentBlocks(data || []);
    } catch (error) {
      console.error('Error fetching content blocks:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить блоки контента',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingBlock) {
        const { error } = await supabase
          .from('content_blocks')
          .update({
            title: formData.title,
            content: formData.content,
            is_active: formData.is_active,
          })
          .eq('id', editingBlock.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('content_blocks')
          .insert([{
            block_key: formData.block_key,
            title: formData.title,
            content: formData.content,
            is_active: formData.is_active,
            metadata: {}
          }]);
        if (error) throw error;
      }

      toast({
        title: 'Успешно',
        description: `Блок контента ${editingBlock ? 'обновлен' : 'создан'}`,
      });

      fetchContentBlocks();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving content block:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить блок контента',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (block: ContentBlock) => {
    setEditingBlock(block);
    setFormData({
      block_key: block.block_key,
      title: block.title || '',
      content: block.content || '',
      is_active: block.is_active,
    });
    setDialogOpen(true);
  };

  const handleCreate = (blockKey: string) => {
    setEditingBlock(null);
    setFormData({
      block_key: blockKey,
      title: '',
      content: '',
      is_active: true,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      block_key: '',
      title: '',
      content: '',
      is_active: true,
    });
    setEditingBlock(null);
  };

  const getBlockInfo = (key: string) => {
    return ALL_BLOCKS.find(b => b.key === key);
  };

  const getExistingBlock = (key: string) => {
    return contentBlocks.find(block => block.block_key === key);
  };

  const instructionBlocks = INSTRUCTION_BLOCKS.map(block => ({
    ...block,
    existingBlock: getExistingBlock(block.key)
  }));

  const manualBlocks = MANUAL_BLOCKS.map(block => ({
    ...block,
    existingBlock: getExistingBlock(block.key)
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Управление инструкциями КЭМП</h1>
        <p className="text-muted-foreground">Редактируйте инструкции и руководство для участников</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Инструкции */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Инструкции для участников
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {instructionBlocks.map((block) => (
                <div key={block.key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{block.name}</p>
                    <p className="text-sm text-muted-foreground font-mono">{block.key}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {block.existingBlock ? (
                      <>
                        <Badge variant={block.existingBlock.is_active ? "default" : "secondary"}>
                          {block.existingBlock.is_active ? "Активен" : "Неактивен"}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEdit(block.existingBlock!)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleCreate(block.key)}
                      >
                        Создать
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Руководство */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Руководство для тренеров
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {manualBlocks.map((block) => (
                <div key={block.key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{block.name}</p>
                    <p className="text-sm text-muted-foreground font-mono">{block.key}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {block.existingBlock ? (
                      <>
                        <Badge variant={block.existingBlock.is_active ? "default" : "secondary"}>
                          {block.existingBlock.is_active ? "Активен" : "Неактивен"}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEdit(block.existingBlock!)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleCreate(block.key)}
                      >
                        Создать
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBlock ? 'Редактировать блок' : 'Создать блок'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {getBlockInfo(formData.block_key)?.name}
            </p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Заголовок</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Заголовок блока"
              />
            </div>

            <div>
              <Label>Содержимое</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Текст блока..."
                rows={8}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              />
              <Label htmlFor="is_active">Активен</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="bg-destructive hover:bg-destructive/90">
                {editingBlock ? 'Обновить' : 'Создать'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
              >
                Отмена
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};