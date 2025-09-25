import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Plus, Edit, Trash2, Users, Dumbbell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Trainer {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  quote: string | null;
  experience: number | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface TrainingProgram {
  id: string;
  name: string;
  description: string | null;
  category: string;
  difficulty_level: number;
  duration_minutes: number | null;
  points_reward: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export const ContentManager: React.FC = () => {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTrainerDialogOpen, setIsTrainerDialogOpen] = useState(false);
  const [isProgramDialogOpen, setIsProgramDialogOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null);
  const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null);
  
  const [trainerFormData, setTrainerFormData] = useState({
    name: '',
    role: '',
    bio: '',
    quote: '',
    experience: '',
    image_url: '',
    sort_order: '1',
  });

  const [programFormData, setProgramFormData] = useState({
    name: '',
    description: '',
    category: '',
    difficulty_level: '1',
    duration_minutes: '',
    points_reward: '',
    image_url: '',
  });

  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [trainersResponse, programsResponse] = await Promise.all([
        supabase.from('trainers').select('*').order('sort_order'),
        supabase.from('training_programs').select('*').order('created_at', { ascending: false })
      ]);

      if (trainersResponse.error) throw trainersResponse.error;
      if (programsResponse.error) throw programsResponse.error;

      setTrainers(trainersResponse.data || []);
      setPrograms(programsResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTrainerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trainerData = {
      name: trainerFormData.name,
      role: trainerFormData.role,
      bio: trainerFormData.bio || null,
      quote: trainerFormData.quote || null,
      experience: trainerFormData.experience ? parseInt(trainerFormData.experience) : null,
      image_url: trainerFormData.image_url || null,
      sort_order: parseInt(trainerFormData.sort_order),
    };

    try {
      if (editingTrainer) {
        const { error } = await supabase
          .from('trainers')
          .update(trainerData)
          .eq('id', editingTrainer.id);
        
        if (error) throw error;
        toast({ title: 'Тренер обновлен', description: 'Изменения сохранены успешно' });
      } else {
        const { error } = await supabase
          .from('trainers')
          .insert([trainerData]);
        
        if (error) throw error;
        toast({ title: 'Тренер добавлен', description: 'Новый тренер добавлен успешно' });
      }

      setIsTrainerDialogOpen(false);
      setEditingTrainer(null);
      setTrainerFormData({
        name: '',
        role: '',
        bio: '',
        quote: '',
        experience: '',
        image_url: '',
        sort_order: '1',
      });
      fetchData();
    } catch (error) {
      console.error('Error saving trainer:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить тренера',
        variant: 'destructive',
      });
    }
  };

  const handleProgramSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const programData = {
      name: programFormData.name,
      description: programFormData.description || null,
      category: programFormData.category,
      difficulty_level: parseInt(programFormData.difficulty_level),
      duration_minutes: programFormData.duration_minutes ? parseInt(programFormData.duration_minutes) : null,
      points_reward: parseInt(programFormData.points_reward),
      image_url: programFormData.image_url || null,
    };

    try {
      if (editingProgram) {
        const { error } = await supabase
          .from('training_programs')
          .update(programData)
          .eq('id', editingProgram.id);
        
        if (error) throw error;
        toast({ title: 'Программа обновлена', description: 'Изменения сохранены успешно' });
      } else {
        const { error } = await supabase
          .from('training_programs')
          .insert([programData]);
        
        if (error) throw error;
        toast({ title: 'Программа создана', description: 'Новая программа добавлена успешно' });
      }

      setIsProgramDialogOpen(false);
      setEditingProgram(null);
      setProgramFormData({
        name: '',
        description: '',
        category: '',
        difficulty_level: '1',
        duration_minutes: '',
        points_reward: '',
        image_url: '',
      });
      fetchData();
    } catch (error) {
      console.error('Error saving program:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить программу',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="kamp-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-kamp-accent">
          <FileText className="w-5 h-5" />
          Управление контентом
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="trainers" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="trainers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Тренеры
            </TabsTrigger>
            <TabsTrigger value="programs" className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4" />
              Программы
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trainers" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Управление тренерами</h3>
              <Dialog open={isTrainerDialogOpen} onOpenChange={setIsTrainerDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Добавить тренера
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTrainer ? 'Редактировать тренера' : 'Добавить нового тренера'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleTrainerSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="trainer-name">Имя</Label>
                      <Input
                        id="trainer-name"
                        value={trainerFormData.name}
                        onChange={(e) => setTrainerFormData({ ...trainerFormData, name: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="trainer-role">Роль</Label>
                      <Input
                        id="trainer-role"
                        value={trainerFormData.role}
                        onChange={(e) => setTrainerFormData({ ...trainerFormData, role: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="trainer-experience">Опыт (лет)</Label>
                      <Input
                        id="trainer-experience"
                        type="number"
                        value={trainerFormData.experience}
                        onChange={(e) => setTrainerFormData({ ...trainerFormData, experience: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="trainer-image">URL изображения</Label>
                      <Input
                        id="trainer-image"
                        value={trainerFormData.image_url}
                        onChange={(e) => setTrainerFormData({ ...trainerFormData, image_url: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="trainer-bio">Биография</Label>
                      <Textarea
                        id="trainer-bio"
                        value={trainerFormData.bio}
                        onChange={(e) => setTrainerFormData({ ...trainerFormData, bio: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="trainer-quote">Цитата</Label>
                      <Textarea
                        id="trainer-quote"
                        value={trainerFormData.quote}
                        onChange={(e) => setTrainerFormData({ ...trainerFormData, quote: e.target.value })}
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setIsTrainerDialogOpen(false)}>
                        Отмена
                      </Button>
                      <Button type="submit">
                        {editingTrainer ? 'Сохранить' : 'Добавить'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-pulse">Загрузка тренеров...</div>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя</TableHead>
                      <TableHead>Роль</TableHead>
                      <TableHead>Опыт</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trainers.map((trainer) => (
                      <TableRow key={trainer.id}>
                        <TableCell>
                          <div className="font-medium">{trainer.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{trainer.role}</Badge>
                        </TableCell>
                        <TableCell>
                          {trainer.experience ? `${trainer.experience} лет` : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={trainer.is_active ? "default" : "secondary"}>
                            {trainer.is_active ? 'Активен' : 'Неактивен'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="programs" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Тренировочные программы</h3>
              <Dialog open={isProgramDialogOpen} onOpenChange={setIsProgramDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Добавить программу
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProgram ? 'Редактировать программу' : 'Добавить новую программу'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleProgramSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="program-name">Название программы</Label>
                      <Input
                        id="program-name"
                        value={programFormData.name}
                        onChange={(e) => setProgramFormData({ ...programFormData, name: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="program-category">Категория</Label>
                      <Input
                        id="program-category"
                        value={programFormData.category}
                        onChange={(e) => setProgramFormData({ ...programFormData, category: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="program-difficulty">Сложность</Label>
                        <Input
                          id="program-difficulty"
                          type="number"
                          min="1"
                          max="5"
                          value={programFormData.difficulty_level}
                          onChange={(e) => setProgramFormData({ ...programFormData, difficulty_level: e.target.value })}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="program-points">Очки</Label>
                        <Input
                          id="program-points"
                          type="number"
                          value={programFormData.points_reward}
                          onChange={(e) => setProgramFormData({ ...programFormData, points_reward: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="program-duration">Длительность (мин)</Label>
                      <Input
                        id="program-duration"
                        type="number"
                        value={programFormData.duration_minutes}
                        onChange={(e) => setProgramFormData({ ...programFormData, duration_minutes: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="program-description">Описание</Label>
                      <Textarea
                        id="program-description"
                        value={programFormData.description}
                        onChange={(e) => setProgramFormData({ ...programFormData, description: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setIsProgramDialogOpen(false)}>
                        Отмена
                      </Button>
                      <Button type="submit">
                        {editingProgram ? 'Сохранить' : 'Добавить'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-pulse">Загрузка программ...</div>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>Категория</TableHead>
                      <TableHead>Сложность</TableHead>
                      <TableHead>Очки</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programs.map((program) => (
                      <TableRow key={program.id}>
                        <TableCell>
                          <div className="font-medium">{program.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{program.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge>{program.difficulty_level}/5</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge>{program.points_reward}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={program.is_active ? "default" : "secondary"}>
                            {program.is_active ? 'Активна' : 'Неактивна'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};