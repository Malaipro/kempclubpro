import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, X, Video, Image as ImageIcon, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getVideoEmbedUrl, getVideoType } from '@/lib/videoUtils';

interface Moment {
  id: string;
  title?: string;
  description?: string;
  image_url: string;
  video_url?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export const MomentsManagement: React.FC = () => {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMoment, setEditingMoment] = useState<Moment | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [previewOpen, setPreviewOpen] = useState<{ type: 'video' | 'image' | null; url: string }>({ type: null, url: '' });
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    video_url: '',
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    fetchMoments();
  }, []);

  const fetchMoments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('moments')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setMoments(data || []);
    } catch (error) {
      console.error('Error fetching moments:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить моменты',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, type: 'image' | 'video') => {
    const setUploading = type === 'image' ? setUploadingImage : setUploadingVideo;
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'dat';
      const timestamp = Date.now();
      const filePath = `${type}s/${timestamp}.${fileExt}`;

      if (type === 'video') {
        // Use signed upload for better reliability on larger files
        const { data: signed, error: signErr } = await supabase
          .storage
          .from('moments')
          .createSignedUploadUrl(filePath);

        if (signErr || !signed) throw signErr || new Error('Не удалось создать ссылку для загрузки');

        const { error: putErr } = await supabase
          .storage
          .from('moments')
          .uploadToSignedUrl(filePath, signed.token, file, {
            contentType: file.type,
            upsert: true,
          });

        if (putErr) throw putErr;
      } else {
        const { error: uploadError } = await supabase.storage
          .from('moments')
          .upload(filePath, file, {
            contentType: file.type,
            upsert: true,
          });

        if (uploadError) throw uploadError;
      }

      const { data } = supabase.storage
        .from('moments')
        .getPublicUrl(filePath);

      const field = type === 'image' ? 'image_url' : 'video_url';
      setFormData(prev => ({ ...prev, [field]: data.publicUrl }));

      toast({
        title: 'Успешно',
        description: `${type === 'image' ? 'Изображение' : 'Видео'} загружено`,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Ошибка загрузки',
        description: error?.message || 'Не удалось загрузить файл',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingMoment) {
        const { error } = await supabase
          .from('moments')
          .update(formData)
          .eq('id', editingMoment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('moments')
          .insert([formData]);
        if (error) throw error;
      }

      toast({
        title: 'Успешно',
        description: `Момент ${editingMoment ? 'обновлен' : 'создан'}`,
      });

      fetchMoments();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving moment:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить момент',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (moment: Moment) => {
    setEditingMoment(moment);
    setFormData({
      title: moment.title || '',
      description: moment.description || '',
      image_url: moment.image_url,
      video_url: moment.video_url || '',
      is_active: moment.is_active,
      sort_order: moment.sort_order,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить момент?')) return;

    try {
      const { error } = await supabase
        .from('moments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Момент удален',
      });

      fetchMoments();
    } catch (error) {
      console.error('Error deleting moment:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить момент',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      video_url: '',
      is_active: true,
      sort_order: 0,
    });
    setEditingMoment(null);
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
          <h1 className="text-2xl font-bold">Управление моментами КЭМП</h1>
          <p className="text-muted-foreground">Добавляйте фото и видео из жизни клуба</p>
        </div>
        <Button onClick={openDialog} className="bg-destructive hover:bg-destructive/90">
          <Plus className="w-4 h-4 mr-2" />
          Добавить момент
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {moments.map((moment) => (
          <Card key={moment.id} className="overflow-hidden">
            <div className="aspect-square relative">
              {moment.image_url && (
                <img 
                  src={moment.image_url} 
                  alt={moment.title || 'Момент КЭМП'}
                  className="w-full h-full object-cover"
                />
              )}
              {moment.video_url && (
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="bg-black/70 text-white">
                    <Video className="w-3 h-3 mr-1" />
                    Видео
                  </Badge>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <Badge variant={moment.is_active ? "default" : "secondary"}>
                    {moment.is_active ? "Активен" : "Неактивен"}
                  </Badge>
                  <span className="text-white text-sm">{moment.sort_order}</span>
                </div>
              </div>
            </div>
            
            <CardContent className="p-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm line-clamp-1">
                  {moment.title || 'Без заголовка'}
                </h3>
                {moment.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {moment.description}
                  </p>
                )}
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleEdit(moment)}
                    className="flex-1"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Изменить
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDelete(moment.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMoment ? 'Редактировать момент' : 'Добавить момент'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Заголовок</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Заголовок момента"
              />
            </div>

            <div>
              <Label>Описание</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Описание момента..."
                rows={3}
              />
            </div>

            <div>
              <Label>Изображение *</Label>
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
                {uploadingImage && <p className="text-sm text-muted-foreground">Загрузка изображения...</p>}
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

            <div>
              <Label>Видео (опционально)</Label>
              <div className="space-y-2">
                <Input
                  value={formData.video_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                  placeholder="URL видео или загрузите файл ниже"
                />
                <Input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'video');
                  }}
                  disabled={uploadingVideo}
                />
                {uploadingVideo && <p className="text-sm text-muted-foreground">Загрузка видео...</p>}
                {formData.video_url && (
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-500">Видео загружено</span>
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
                {editingMoment ? 'Обновить' : 'Создать'}
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