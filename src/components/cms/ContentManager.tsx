import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Save } from 'lucide-react';

// Типы для контента
interface PageContent {
  id: string;
  page_name: string;
  section_name: string;
  content_value: string;
  sort_order: number;
}

interface Trainer {
  id: string;
  name: string;
  role: string;
  image_url?: string;
  quote?: string;
  experience?: string;
  bio?: string;
  sort_order: number;
}

interface TrainingProgram {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  benefits?: string[];
  features?: string[];
  price_info?: string;
  sort_order: number;
}

interface GalleryImage {
  id: string;
  title?: string;
  image_url: string;
  description?: string;
  category: string;
  sort_order: number;
}

interface Testimonial {
  id: string;
  name: string;
  position: string | null;
  video_url: string | null;
  text_content: string | null;
  is_active: boolean | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export const ContentManager: React.FC = () => {
  return (
    <Card className="kamp-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-kamp-accent">
          <FileText className="w-5 h-5" />
          Управление контентом
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-400 py-8">
          <FileText className="w-16 h-16 mx-auto mb-4 text-kamp-accent/50" />
          <h3 className="text-lg font-semibold mb-2">CMS в разработке</h3>
          <p className="text-sm">
            Здесь будут инструменты для управления контентом сайта
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
  const [activeTab, setActiveTab] = useState('page-content');
  const queryClient = useQueryClient();

  // Загрузка данных
  const { data: pageContent = [] } = useQuery({
    queryKey: ['pageContent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_content')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as PageContent[];
    },
  });

  const { data: trainers = [] } = useQuery({
    queryKey: ['trainers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainers')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as Trainer[];
    },
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['trainingPrograms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_programs')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as TrainingProgram[];
    },
  });

  const { data: galleryImages = [] } = useQuery({
    queryKey: ['gallery-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gallery_images')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as GalleryImage[];
    },
  });

  const { data: testimonials = [] } = useQuery({
    queryKey: ['testimonials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as Testimonial[];
    },
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Управление контентом</h1>
        <p className="text-gray-400">Редактируйте весь контент сайта прямо здесь</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-gray-800">
          <TabsTrigger value="page-content" className="text-white data-[state=active]:bg-kamp-accent data-[state=active]:text-black">
            Контент страниц
          </TabsTrigger>
          <TabsTrigger value="trainers" className="text-white data-[state=active]:bg-kamp-accent data-[state=active]:text-black">
            Тренеры
          </TabsTrigger>
          <TabsTrigger value="programs" className="text-white data-[state=active]:bg-kamp-accent data-[state=active]:text-black">
            Программы
          </TabsTrigger>
          <TabsTrigger value="gallery" className="text-white data-[state=active]:bg-kamp-accent data-[state=active]:text-black">
            Моменты КЭМП
          </TabsTrigger>
          <TabsTrigger value="testimonials" className="text-white data-[state=active]:bg-kamp-accent data-[state=active]:text-black">
            Отзывы
          </TabsTrigger>
        </TabsList>

        <TabsContent value="page-content">
          <PageContentManager content={pageContent} />
        </TabsContent>

        <TabsContent value="trainers">
          <TrainersManager trainers={trainers} />
        </TabsContent>

        <TabsContent value="programs">
          <ProgramsManager programs={programs} />
        </TabsContent>

        <TabsContent value="gallery">
          <GalleryManager images={galleryImages} />
        </TabsContent>

        <TabsContent value="testimonials">
          <TestimonialsManager testimonials={testimonials} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Компонент для управления контентом страниц
const PageContentManager: React.FC<{ content: PageContent[] }> = ({ content }) => {
  const [editingItem, setEditingItem] = useState<PageContent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (item: PageContent) => {
      const { data, error } = await supabase
        .from('page_content')
        .upsert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pageContent'] });
      setIsDialogOpen(false);
      setEditingItem(null);
      toast.success('Контент обновлен');
    },
    onError: (error) => {
      toast.error('Ошибка обновления: ' + error.message);
    },
  });

  const handleEdit = (item: PageContent) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleSave = (formData: FormData) => {
    const updatedItem = {
      ...editingItem,
      content_value: formData.get('content_value') as string,
    };
    updateMutation.mutate(updatedItem);
  };

  const groupedContent = content.reduce((acc, item) => {
    if (!acc[item.page_name]) acc[item.page_name] = [];
    acc[item.page_name].push(item);
    return acc;
  }, {} as Record<string, PageContent[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedContent).map(([pageName, items]) => (
        <Card key={pageName} className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white capitalize">{pageName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-white">{item.section_name}</h4>
                  <p className="text-gray-300 text-sm truncate max-w-md">{item.content_value}</p>
                </div>
                <Button
                  onClick={() => handleEdit(item)}
                  variant="outline"
                  size="sm"
                  className="text-white border-gray-600"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Редактировать контент</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSave(new FormData(e.currentTarget));
            }} className="space-y-4">
              <div>
                <Label>Содержимое</Label>
                <Textarea
                  name="content_value"
                  defaultValue={editingItem.content_value}
                  className="bg-white text-black"
                  rows={6}
                />
              </div>
              <Button type="submit" className="w-full">
                <Save className="w-4 h-4 mr-2" />
                Сохранить
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Компонент для управления тренерами
const TrainersManager: React.FC<{ trainers: Trainer[] }> = ({ trainers }) => {
  const [editingItem, setEditingItem] = useState<Trainer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (item: Partial<Trainer> & { name: string; role: string }) => {
      const { data, error } = await supabase
        .from('trainers')
        .upsert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      setIsDialogOpen(false);
      setEditingItem(null);
      setIsCreating(false);
      toast.success('Тренер обновлен');
    },
    onError: (error) => {
      toast.error('Ошибка обновления: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('trainers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      toast.success('Тренер удален');
    },
    onError: (error) => {
      toast.error('Ошибка удаления: ' + error.message);
    },
  });

  const handleCreate = () => {
    setEditingItem({
      id: '',
      name: '',
      role: '',
      image_url: '',
      quote: '',
      experience: '',
      bio: '',
      sort_order: trainers.length + 1,
    });
    setIsCreating(true);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: Trainer) => {
    setEditingItem(item);
    setIsCreating(false);
    setIsDialogOpen(true);
  };

  const handleSave = (formData: FormData) => {
    const name = formData.get('name') as string;
    const role = formData.get('role') as string;
    
    if (!name || !role) {
      toast.error('Имя и роль обязательны');
      return;
    }
    
    const updatedItem = {
      ...editingItem,
      name,
      role,
      image_url: formData.get('image_url') as string,
      quote: formData.get('quote') as string,
      experience: formData.get('experience') as string,
      bio: formData.get('bio') as string,
    };
    
    if (isCreating) {
      delete updatedItem.id;
    }
    
    updateMutation.mutate(updatedItem);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Управление тренерами</h2>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Добавить тренера
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trainers.map((trainer) => (
          <Card key={trainer.id} className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              {trainer.image_url && (
                <img
                  src={trainer.image_url}
                  alt={trainer.name}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              <h3 className="text-lg font-bold text-white mb-2">{trainer.name}</h3>
              <p className="text-blue-400 text-sm mb-2">{trainer.role}</p>
              <p className="text-gray-300 text-sm mb-4 line-clamp-3">{trainer.bio}</p>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleEdit(trainer)}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-white border-gray-600"
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Изменить
                </Button>
                <Button
                  onClick={() => deleteMutation.mutate(trainer.id)}
                  variant="destructive"
                  size="sm"
                  className="px-3"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCreating ? 'Добавить тренера' : 'Редактировать тренера'}</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSave(new FormData(e.currentTarget));
            }} className="space-y-4">
              <div>
                <Label>Имя</Label>
                <Input
                  name="name"
                  defaultValue={editingItem.name}
                  className="bg-white text-black"
                  required
                />
              </div>
              <div>
                <Label>Роль</Label>
                <Input
                  name="role"
                  defaultValue={editingItem.role}
                  className="bg-white text-black"
                  required
                />
              </div>
              <div>
                <Label>URL изображения</Label>
                <Input
                  name="image_url"
                  defaultValue={editingItem.image_url}
                  className="bg-white text-black"
                />
              </div>
              <div>
                <Label>Цитата</Label>
                <Input
                  name="quote"
                  defaultValue={editingItem.quote}
                  className="bg-white text-black"
                />
              </div>
              <div>
                <Label>Опыт</Label>
                <Textarea
                  name="experience"
                  defaultValue={editingItem.experience}
                  className="bg-white text-black"
                  rows={3}
                />
              </div>
              <div>
                <Label>Биография</Label>
                <Textarea
                  name="bio"
                  defaultValue={editingItem.bio}
                  className="bg-white text-black"
                  rows={4}
                />
              </div>
              <Button type="submit" className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {isCreating ? 'Создать' : 'Сохранить'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Компонент для управления программами
const ProgramsManager: React.FC<{ programs: TrainingProgram[] }> = ({ programs }) => {
  const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProgram, setNewProgram] = useState({
    title: '',
    description: '',
    price_info: '',
    image_url: ''
  });
  
  const queryClient = useQueryClient();

  const createProgramMutation = useMutation({
    mutationFn: async (programData: typeof newProgram) => {
      const { data, error } = await supabase
        .from('training_programs')
        .insert([programData])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-programs'] });
      setShowCreateForm(false);
      setNewProgram({ title: '', description: '', price_info: '', image_url: '' });
      toast.success('Программа создана успешно');
    }
  });

  const updateProgramMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TrainingProgram> }) => {
      const { data, error } = await supabase
        .from('training_programs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-programs'] });
      setEditingProgram(null);
      toast.success('Программа обновлена успешно');
    }
  });

  const deleteProgramMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_programs')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-programs'] });
      toast.success('Программа удалена успешно');
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Управление программами тренировок</h2>
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="bg-kamp-accent hover:bg-kamp-accent/90 text-black"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить программу
        </Button>
      </div>

      {showCreateForm && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Новая программа</h3>
            <Input
              placeholder="Название программы"
              value={newProgram.title}
              onChange={(e) => setNewProgram(prev => ({ ...prev, title: e.target.value }))}
              className="bg-white"
            />
            <Textarea
              placeholder="Описание программы"
              value={newProgram.description}
              onChange={(e) => setNewProgram(prev => ({ ...prev, description: e.target.value }))}
              className="bg-white"
            />
            <Input
              placeholder="Информация о цене"
              value={newProgram.price_info}
              onChange={(e) => setNewProgram(prev => ({ ...prev, price_info: e.target.value }))}
              className="bg-white"
            />
            <Input
              placeholder="URL изображения"
              value={newProgram.image_url}
              onChange={(e) => setNewProgram(prev => ({ ...prev, image_url: e.target.value }))}
              className="bg-white"
            />
            <div className="flex gap-2">
              <Button onClick={() => createProgramMutation.mutate(newProgram)}>
                Создать
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {editingProgram && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Редактировать программу</h3>
            <Input
              placeholder="Название программы"
              value={editingProgram.title}
              onChange={(e) => setEditingProgram(prev => prev ? { ...prev, title: e.target.value } : null)}
              className="bg-white"
            />
            <Textarea
              placeholder="Описание программы"
              value={editingProgram.description || ''}
              onChange={(e) => setEditingProgram(prev => prev ? { ...prev, description: e.target.value } : null)}
              className="bg-white"
            />
            <Input
              placeholder="Информация о цене"
              value={editingProgram.price_info || ''}
              onChange={(e) => setEditingProgram(prev => prev ? { ...prev, price_info: e.target.value } : null)}
              className="bg-white"
            />
            <Input
              placeholder="URL изображения"
              value={editingProgram.image_url || ''}
              onChange={(e) => setEditingProgram(prev => prev ? { ...prev, image_url: e.target.value } : null)}
              className="bg-white"
            />
            <div className="flex gap-2">
              <Button onClick={() => updateProgramMutation.mutate({ 
                id: editingProgram.id, 
                updates: editingProgram 
              })}>
                Сохранить
              </Button>
              <Button variant="outline" onClick={() => setEditingProgram(null)}>
                Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => (
          <Card key={program.id} className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-white">{program.title}</h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingProgram(program)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm('Удалить программу?')) {
                        deleteProgramMutation.mutate(program.id);
                      }
                    }}
                    className="border-red-600 text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-2">{program.description}</p>
              {program.price_info && (
                <p className="text-kamp-accent text-sm font-semibold">{program.price_info}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Компонент для управления галереей
const GalleryManager: React.FC<{ images: GalleryImage[] }> = ({ images }) => {
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newImage, setNewImage] = useState({
    title: '',
    image_url: '',
    description: '',
    category: 'general'
  });
  
  const queryClient = useQueryClient();

  const createImageMutation = useMutation({
    mutationFn: async (imageData: typeof newImage) => {
      const { data, error } = await supabase
        .from('gallery_images')
        .insert([imageData])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-images'] });
      setShowCreateForm(false);
      setNewImage({ title: '', image_url: '', description: '', category: 'general' });
      toast.success('Изображение добавлено успешно');
    }
  });

  const updateImageMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<GalleryImage> }) => {
      const { data, error } = await supabase
        .from('gallery_images')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-images'] });
      setEditingImage(null);
      toast.success('Изображение обновлено успешно');
    }
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gallery_images')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-images'] });
      toast.success('Изображение удалено успешно');
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Управление галереей</h2>
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="bg-kamp-accent hover:bg-kamp-accent/90 text-black"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить изображение
        </Button>
      </div>

      {showCreateForm && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Новое изображение</h3>
            <Input
              placeholder="Название изображения"
              value={newImage.title}
              onChange={(e) => setNewImage(prev => ({ ...prev, title: e.target.value }))}
              className="bg-white"
            />
            <Input
              placeholder="URL изображения"
              value={newImage.image_url}
              onChange={(e) => setNewImage(prev => ({ ...prev, image_url: e.target.value }))}
              className="bg-white"
            />
            <Textarea
              placeholder="Описание"
              value={newImage.description}
              onChange={(e) => setNewImage(prev => ({ ...prev, description: e.target.value }))}
              className="bg-white"
            />
            <Select
              value={newImage.category}
              onValueChange={(value) => setNewImage(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Общее</SelectItem>
                <SelectItem value="training">Тренировки</SelectItem>
                <SelectItem value="events">События</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={() => createImageMutation.mutate(newImage)}>
                Добавить
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {editingImage && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Редактировать изображение</h3>
            <Input
              placeholder="Название изображения"
              value={editingImage.title || ''}
              onChange={(e) => setEditingImage(prev => prev ? { ...prev, title: e.target.value } : null)}
              className="bg-white"
            />
            <Input
              placeholder="URL изображения"
              value={editingImage.image_url}
              onChange={(e) => setEditingImage(prev => prev ? { ...prev, image_url: e.target.value } : null)}
              className="bg-white"
            />
            <Textarea
              placeholder="Описание"
              value={editingImage.description || ''}
              onChange={(e) => setEditingImage(prev => prev ? { ...prev, description: e.target.value } : null)}
              className="bg-white"
            />
            <Select
              value={editingImage.category || 'general'}
              onValueChange={(value) => setEditingImage(prev => prev ? { ...prev, category: value } : null)}
            >
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Общее</SelectItem>
                <SelectItem value="training">Тренировки</SelectItem>
                <SelectItem value="events">События</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={() => updateImageMutation.mutate({ 
                id: editingImage.id, 
                updates: editingImage 
              })}>
                Сохранить
              </Button>
              <Button variant="outline" onClick={() => setEditingImage(null)}>
                Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => (
          <Card key={image.id} className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="relative group">
                <img
                  src={image.image_url}
                  alt={image.title}
                  className="w-full h-32 object-cover rounded-lg mb-2"
                />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingImage(image)}
                    className="bg-white/90"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm('Удалить изображение?')) {
                        deleteImageMutation.mutate(image.id);
                      }
                    }}
                    className="bg-red-500/90 text-white"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <p className="text-white text-sm font-medium">{image.title}</p>
              {image.description && (
                <p className="text-gray-400 text-xs mt-1">{image.description}</p>
              )}
              <Badge variant="secondary" className="mt-2 text-xs">
                {image.category}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Компонент для управления отзывами
const TestimonialsManager: React.FC<{ testimonials: Testimonial[] }> = ({ testimonials }) => {
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTestimonial, setNewTestimonial] = useState({
    name: '',
    position: '',
    video_url: '',
    text_content: ''
  });
  
  const queryClient = useQueryClient();

  const createTestimonialMutation = useMutation({
    mutationFn: async (testimonialData: typeof newTestimonial) => {
      const { data, error } = await supabase
        .from('testimonials')
        .insert([testimonialData])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
      setShowCreateForm(false);
      setNewTestimonial({ name: '', position: '', video_url: '', text_content: '' });
      toast.success('Отзыв создан успешно');
    }
  });

  const updateTestimonialMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Testimonial> }) => {
      const { data, error } = await supabase
        .from('testimonials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
      setEditingTestimonial(null);
      toast.success('Отзыв обновлен успешно');
    }
  });

  const deleteTestimonialMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('testimonials')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
      toast.success('Отзыв удален успешно');
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Управление отзывами</h2>
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="bg-kamp-accent hover:bg-kamp-accent/90 text-black"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить отзыв
        </Button>
      </div>

      {showCreateForm && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Новый отзыв</h3>
            <Input
              placeholder="Имя участника"
              value={newTestimonial.name}
              onChange={(e) => setNewTestimonial(prev => ({ ...prev, name: e.target.value }))}
              className="bg-white"
            />
            <Input
              placeholder="Должность/статус"
              value={newTestimonial.position}
              onChange={(e) => setNewTestimonial(prev => ({ ...prev, position: e.target.value }))}
              className="bg-white"
            />
            <Input
              placeholder="URL видео"
              value={newTestimonial.video_url}
              onChange={(e) => setNewTestimonial(prev => ({ ...prev, video_url: e.target.value }))}
              className="bg-white"
            />
            <Textarea
              placeholder="Текст отзыва (опционально)"
              value={newTestimonial.text_content}
              onChange={(e) => setNewTestimonial(prev => ({ ...prev, text_content: e.target.value }))}
              className="bg-white"
            />
            <div className="flex gap-2">
              <Button onClick={() => createTestimonialMutation.mutate(newTestimonial)}>
                Создать
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {editingTestimonial && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Редактировать отзыв</h3>
            <Input
              placeholder="Имя участника"
              value={editingTestimonial.name}
              onChange={(e) => setEditingTestimonial(prev => prev ? { ...prev, name: e.target.value } : null)}
              className="bg-white"
            />
            <Input
              placeholder="Должность/статус"
              value={editingTestimonial.position || ''}
              onChange={(e) => setEditingTestimonial(prev => prev ? { ...prev, position: e.target.value } : null)}
              className="bg-white"
            />
            <Input
              placeholder="URL видео"
              value={editingTestimonial.video_url || ''}
              onChange={(e) => setEditingTestimonial(prev => prev ? { ...prev, video_url: e.target.value } : null)}
              className="bg-white"
            />
            <Textarea
              placeholder="Текст отзыва"
              value={editingTestimonial.text_content || ''}
              onChange={(e) => setEditingTestimonial(prev => prev ? { ...prev, text_content: e.target.value } : null)}
              className="bg-white"
            />
            <div className="flex gap-2">
              <Button onClick={() => updateTestimonialMutation.mutate({ 
                id: editingTestimonial.id, 
                updates: editingTestimonial 
              })}>
                Сохранить
              </Button>
              <Button variant="outline" onClick={() => setEditingTestimonial(null)}>
                Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.map((testimonial) => (
          <Card key={testimonial.id} className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-white">{testimonial.name}</h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingTestimonial(testimonial)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm('Удалить отзыв?')) {
                        deleteTestimonialMutation.mutate(testimonial.id);
                      }
                    }}
                    className="border-red-600 text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-2">{testimonial.position}</p>
              {testimonial.video_url && (
                <p className="text-blue-400 text-sm mb-2">Видео: {testimonial.video_url}</p>
              )}
              {testimonial.text_content && (
                <p className="text-gray-300 text-sm">{testimonial.text_content}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};