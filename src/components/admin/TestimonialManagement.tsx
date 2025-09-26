import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Upload, X, Video, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getVideoEmbedUrl, getVideoType } from '@/lib/videoUtils';

interface Testimonial {
  id: string;
  participant_name: string;
  participant_title?: string;
  content?: string;
  video_url?: string;
  image_url?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export const TestimonialManagement: React.FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [previewOpen, setPreviewOpen] = useState<{ type: 'video' | 'image' | null; url: string }>({ type: null, url: '' });
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    participant_name: '',
    participant_title: '',
    content: '',
    video_url: '',
    image_url: '',
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить отзывы',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, type: 'image') => {
    setUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('testimonials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('testimonials')
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
        description: 'Не удалось загрузить файл',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Видео-загрузка через подписанные ссылки для надёжности
  const handleVideoFileUpload = async (file: File) => {
    setUploadingVideo(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      const path = `${Date.now()}.${ext}`;

      const { data: signed, error: signErr } = await supabase
        .storage
        .from('testimonials')
        .createSignedUploadUrl(path);
      if (signErr || !signed) throw signErr || new Error('Не удалось создать ссылку для загрузки');

      const { error: putErr } = await supabase
        .storage
        .from('testimonials')
        .uploadToSignedUrl(path, signed.token, file, {
          contentType: file.type,
          upsert: true,
        });
      if (putErr) throw putErr;

      const { data } = supabase.storage.from('testimonials').getPublicUrl(path);
      setFormData(prev => ({ ...prev, video_url: data.publicUrl }));

      toast({ title: 'Успешно', description: 'Видео загружено' });
    } catch (error: any) {
      console.error('Video upload error:', error);
      toast({ title: 'Ошибка загрузки', description: error?.message || 'Не удалось загрузить видео', variant: 'destructive' });
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingTestimonial) {
        const { error } = await supabase
          .from('testimonials')
          .update(formData)
          .eq('id', editingTestimonial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('testimonials')
          .insert([formData]);
        if (error) throw error;
      }

      toast({
        title: 'Успешно',
        description: `Отзыв ${editingTestimonial ? 'обновлен' : 'создан'}`,
      });

      fetchTestimonials();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving testimonial:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить отзыв',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setFormData({
      participant_name: testimonial.participant_name,
      participant_title: testimonial.participant_title || '',
      content: testimonial.content || '',
      video_url: testimonial.video_url || '',
      image_url: testimonial.image_url || '',
      is_active: testimonial.is_active,
      sort_order: testimonial.sort_order,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить отзыв?')) return;

    try {
      const { error } = await supabase
        .from('testimonials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Отзыв удален',
      });

      fetchTestimonials();
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить отзыв',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      participant_name: '',
      participant_title: '',
      content: '',
      video_url: '',
      image_url: '',
      is_active: true,
      sort_order: 0,
    });
    setEditingTestimonial(null);
    setPreviewOpen({ type: null, url: '' });
  };

  const handlePreview = (type: 'video' | 'image', url: string) => {
    if (!url.trim()) {
      toast({
        title: 'Внимание',
        description: 'Введите URL для предпросмотра',
        variant: 'destructive',
      });
      return;
    }
    setPreviewOpen({ type, url: url.trim() });
  };

  const closePreview = () => {
    setPreviewOpen({ type: null, url: '' });
  };

  const openDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Управление отзывами</h1>
          <p className="text-muted-foreground">Добавляйте и редактируйте отзывы участников</p>
        </div>
        <Button onClick={openDialog} className="bg-destructive hover:bg-destructive/90">
          <Plus className="w-4 h-4 mr-2" />
          Добавить отзыв
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Отзывы участников</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Участник</TableHead>
                  <TableHead>Должность</TableHead>
                  <TableHead>Содержание</TableHead>
                  <TableHead>Медиа</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Порядок</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testimonials.map((testimonial) => (
                  <TableRow key={testimonial.id}>
                    <TableCell className="font-medium">{testimonial.participant_name}</TableCell>
                    <TableCell>{testimonial.participant_title || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{testimonial.content || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {testimonial.video_url && (
                          <Badge variant="secondary" className="text-xs">
                            <Video className="w-3 h-3 mr-1" />
                            Видео
                          </Badge>
                        )}
                        {testimonial.image_url && (
                          <Badge variant="secondary" className="text-xs">
                            <ImageIcon className="w-3 h-3 mr-1" />
                            Фото
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={testimonial.is_active ? "default" : "secondary"}>
                        {testimonial.is_active ? "Активен" : "Неактивен"}
                      </Badge>
                    </TableCell>
                    <TableCell>{testimonial.sort_order}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(testimonial)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(testimonial.id)}
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
              {editingTestimonial ? 'Редактировать отзыв' : 'Добавить отзыв'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Имя участника *</Label>
                <Input
                  value={formData.participant_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, participant_name: e.target.value }))}
                  placeholder="Александр К."
                  required
                />
              </div>
              <div>
                <Label>Должность</Label>
                <Input
                  value={formData.participant_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, participant_title: e.target.value }))}
                  placeholder="Участник КЭМП"
                />
              </div>
            </div>

            <div>
              <Label>Содержание отзыва</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Текст отзыва (необязательно)..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Видео URL</Label>
                <div className="space-y-2">
                  <Input
                    value={formData.video_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=... или прямая ссылка на видео"
                  />
                  <p className="text-xs text-muted-foreground">
                    Поддерживаются YouTube, Vimeo, прямые ссылки на .mp4, .webm
                  </p>
                  <Input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleVideoFileUpload(file);
                    }}
                    disabled={uploadingVideo}
                  />
                  {uploadingVideo && (
                    <p className="text-sm text-muted-foreground">Загрузка видео...</p>
                  )}
                   {formData.video_url && (
                     <div className="flex items-center gap-2">
                       <Video className="w-4 h-4 text-green-500" />
                       <span className="text-sm text-green-500">Видео добавлено</span>
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={() => handlePreview('video', formData.video_url)}
                         className="mr-2"
                       >
                         <Eye className="w-3 h-3" />
                       </Button>
                       <Button
                         type="button"
                         variant="ghost"
                         size="sm"
                         onClick={() => setFormData(prev => ({ ...prev, video_url: '' }))}
                       >
                         <X className="w-3 h-3" />
                       </Button>
                     </div>
                   )}
                </div>
              </div>

              <div>
                <Label>Изображение</Label>
                <div className="space-y-2">
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    placeholder="URL изображения или загрузите файл ниже"
                  />
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'image');
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
                         variant="outline"
                         size="sm"
                         onClick={() => handlePreview('image', formData.image_url)}
                         className="mr-2"
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Порядок сортировки</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
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
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="bg-destructive hover:bg-destructive/90">
                {editingTestimonial ? 'Обновить' : 'Создать'}
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

      {/* Preview Dialog */}
      <Dialog open={previewOpen.type !== null} onOpenChange={closePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                Предпросмотр {previewOpen.type === 'video' ? 'видео' : 'изображения'}
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={closePreview}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
          
          {previewOpen.type === 'video' && previewOpen.url && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">URL: {previewOpen.url}</p>
              {getVideoType(previewOpen.url) === 'youtube' || getVideoType(previewOpen.url) === 'vimeo' ? (
                <div className="aspect-video">
                  <iframe
                    src={getVideoEmbedUrl(previewOpen.url)}
                    className="w-full h-full rounded-lg"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    src={previewOpen.url}
                    controls
                    className="w-full h-full object-cover"
                    onError={() => toast({
                      title: 'Ошибка',
                      description: 'Не удалось загрузить видео. Проверьте URL.',
                      variant: 'destructive',
                    })}
                  />
                </div>
              )}
            </div>
          )}

          {previewOpen.type === 'image' && previewOpen.url && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">URL: {previewOpen.url}</p>
              <div className="flex justify-center bg-gray-50 rounded-lg p-4">
                <img
                  src={previewOpen.url}
                  alt="Предпросмотр"
                  className="max-w-full max-h-96 object-contain rounded-lg"
                  onError={() => toast({
                    title: 'Ошибка',
                    description: 'Не удалось загрузить изображение. Проверьте URL.',
                    variant: 'destructive',
                  })}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};