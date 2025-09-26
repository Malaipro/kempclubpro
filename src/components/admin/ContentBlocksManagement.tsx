import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Upload, X, Image as ImageIcon, Eye } from 'lucide-react';
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

const PREDEFINED_BLOCKS = [
  // Основной сайт
  { key: 'hero_title', name: 'Заголовок главной секции', type: 'text' },
  { key: 'hero_subtitle', name: 'Подзаголовок главной секции', type: 'text' },
  { key: 'hero_description', name: 'Описание главной секции', type: 'textarea' },
  { key: 'about_title', name: 'Заголовок раздела "О нас"', type: 'text' },
  { key: 'about_content', name: 'Содержимое раздела "О нас"', type: 'textarea' },
  { key: 'program_title', name: 'Заголовок раздела "Программа"', type: 'text' },
  { key: 'program_content', name: 'Содержимое раздела "Программа"', type: 'textarea' },
  { key: 'gallery_title', name: 'Заголовок галереи', type: 'text' },
  { key: 'gallery_subtitle', name: 'Подзаголовок галереи', type: 'text' },
  { key: 'testimonials_title', name: 'Заголовок отзывов', type: 'text' },
  { key: 'testimonials_subtitle', name: 'Подзаголовок отзывов', type: 'text' },
  { key: 'contact_title', name: 'Заголовок контактной формы', type: 'text' },
  { key: 'contact_description', name: 'Описание контактной формы', type: 'textarea' },
  
  // Система КЭМП - Инструкция
  { key: 'kamp_instructions_title', name: 'КЭМП - Заголовок инструкции', type: 'text' },
  { key: 'kamp_instructions_subtitle', name: 'КЭМП - Подзаголовок инструкции', type: 'text' },
  { key: 'kamp_gamification_why', name: 'КЭМП - Зачем геймификация', type: 'textarea' },
  { key: 'kamp_bracelet_info', name: 'КЭМП - Информация о браслете', type: 'textarea' },
  { key: 'kamp_quick_rules', name: 'КЭМП - Быстрые правила', type: 'textarea' },
  { key: 'kamp_roles_info', name: 'КЭМП - Описание ролей', type: 'textarea' },
  { key: 'kamp_special_totems', name: 'КЭМП - Особые тотемы', type: 'textarea' },
  
  // Система КЭМП - Руководство
  { key: 'kamp_manual_title', name: 'КЭМП - Заголовок руководства', type: 'text' },
  { key: 'kamp_manual_subtitle', name: 'КЭМП - Подзаголовок руководства', type: 'text' },
  { key: 'kamp_manual_important', name: 'КЭМП - Важное сообщение', type: 'textarea' },
  { key: 'kamp_manual_db_structure', name: 'КЭМП - Структура БД', type: 'textarea' },
  { key: 'kamp_manual_activities', name: 'КЭМП - Как заполнять активности', type: 'textarea' },
  { key: 'kamp_manual_totems', name: 'КЭМП - Автоматический расчет тотемов', type: 'textarea' },
  { key: 'kamp_manual_roles', name: 'КЭМП - Роли и ответственности', type: 'textarea' },
  { key: 'kamp_manual_multipliers', name: 'КЭМП - Множители', type: 'textarea' },
];

export const ContentBlocksManagement: React.FC = () => {
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ContentBlock | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    block_key: '',
    title: '',
    content: '',
    image_url: '',
    metadata: {},
    is_active: true,
  });

  useEffect(() => {
    fetchContentBlocks();
  }, []);

  const fetchContentBlocks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('content_blocks')
        .select('*')
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

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('content')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('content')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: data.publicUrl }));

      toast({
        title: 'Успешно',
        description: 'Изображение загружено',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить изображение',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
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
            image_url: formData.image_url,
            metadata: formData.metadata,
            is_active: formData.is_active,
          })
          .eq('id', editingBlock.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('content_blocks')
          .insert([formData]);
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
      image_url: block.image_url || '',
      metadata: block.metadata || {},
      is_active: block.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить блок контента?')) return;

    try {
      const { error } = await supabase
        .from('content_blocks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Блок контента удален',
      });

      fetchContentBlocks();
    } catch (error) {
      console.error('Error deleting content block:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить блок контента',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      block_key: '',
      title: '',
      content: '',
      image_url: '',
      metadata: {},
      is_active: true,
    });
    setEditingBlock(null);
  };

  const openDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const getPredefinedBlockName = (key: string) => {
    const block = PREDEFINED_BLOCKS.find(b => b.key === key);
    return block?.name || key;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Управление контентом сайта</h1>
          <p className="text-muted-foreground">Редактируйте текст и изображения на сайте</p>
        </div>
        <Button onClick={openDialog} className="bg-destructive hover:bg-destructive/90">
          <Plus className="w-4 h-4 mr-2" />
          Добавить блок
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Блоки контента</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ключ блока</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Заголовок</TableHead>
                  <TableHead>Содержимое</TableHead>
                  <TableHead>Изображение</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contentBlocks.map((block) => (
                  <TableRow key={block.id}>
                    <TableCell className="font-mono text-sm">{block.block_key}</TableCell>
                    <TableCell className="font-medium">{getPredefinedBlockName(block.block_key)}</TableCell>
                    <TableCell className="max-w-xs truncate">{block.title || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{block.content || '-'}</TableCell>
                    <TableCell>
                      {block.image_url && (
                        <Badge variant="secondary" className="text-xs">
                          <ImageIcon className="w-3 h-3 mr-1" />
                          Есть
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={block.is_active ? "default" : "secondary"}>
                        {block.is_active ? "Активен" : "Неактивен"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(block)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(block.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBlock ? 'Редактировать блок контента' : 'Добавить блок контента'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Ключ блока *</Label>
              {editingBlock ? (
                <Input
                  value={formData.block_key}
                  disabled
                  className="bg-muted"
                />
              ) : (
                <select 
                  className="w-full p-2 border rounded-md"
                  value={formData.block_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, block_key: e.target.value }))}
                  required
                >
                  <option value="">Выберите блок</option>
                  {PREDEFINED_BLOCKS.map((block) => (
                    <option key={block.key} value={block.key}>
                      {block.name} ({block.key})
                    </option>
                  ))}
                </select>
              )}
            </div>

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
                rows={4}
              />
            </div>

            <div>
              <Label>Изображение</Label>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  disabled={uploadingImage}
                />
                {uploadingImage && <p className="text-sm text-muted-foreground">Загрузка...</p>}
                {formData.image_url && (
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-500">Изображение загружено</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(formData.image_url, '_blank')}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
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