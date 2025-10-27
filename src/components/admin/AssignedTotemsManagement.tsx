import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Award, Loader2, Trash2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { TotemIcon } from '@/components/totems/TotemIcon';

interface AssignedTotem {
  id: string;
  assigned_at: string;
  notes: string | null;
  is_manual: boolean | null;
  user_id: string;
  totem_id: string;
  assigned_by: string | null;
  profiles: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  };
  totems: {
    name: string;
    description: string;
    discipline: string;
    totem_type: string;
    icon_name: string | null;
    icon_color: string | null;
  };
  assigned_by_profile?: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export const AssignedTotemsManagement: React.FC = () => {
  const { toast } = useToast();
  const [assignedTotems, setAssignedTotems] = useState<AssignedTotem[]>([]);
  const [filteredTotems, setFilteredTotems] = useState<AssignedTotem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [totemToDelete, setTotemToDelete] = useState<AssignedTotem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadAssignedTotems();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = assignedTotems.filter((at) => {
        const userName = at.profiles.display_name || 
          `${at.profiles.first_name} ${at.profiles.last_name}`;
        const totemName = at.totems.name;
        const searchLower = searchQuery.toLowerCase();
        
        return userName.toLowerCase().includes(searchLower) ||
               totemName.toLowerCase().includes(searchLower);
      });
      setFilteredTotems(filtered);
    } else {
      setFilteredTotems(assignedTotems);
    }
  }, [searchQuery, assignedTotems]);

  const loadAssignedTotems = async () => {
    try {
      const { data, error } = await supabase
        .from('user_totems')
        .select(`
          *,
          totems (
            name,
            description,
            discipline,
            totem_type,
            icon_name,
            icon_color
          )
        `)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      // Загружаем профили участников
      const userIds = [...new Set(data?.map(t => t.user_id))];
      const { data: userProfiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name')
        .in('user_id', userIds);

      const userProfilesMap = userProfiles?.reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {} as Record<string, any>) || {};

      // Загружаем профили тех, кто присвоил тотемы
      const assignedByIds = [...new Set(data?.map(t => t.assigned_by).filter(Boolean))];
      
      let assignedByProfiles: any = {};
      if (assignedByIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, display_name, first_name, last_name')
          .in('user_id', assignedByIds);

        if (profilesData) {
          assignedByProfiles = profilesData.reduce((acc, p) => {
            acc[p.user_id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      const enrichedData = data?.map(item => ({
        ...item,
        profiles: userProfilesMap[item.user_id] || {
          display_name: null,
          first_name: 'Неизвестный',
          last_name: 'участник'
        },
        assigned_by_profile: item.assigned_by ? assignedByProfiles[item.assigned_by] : null
      }));

      setAssignedTotems(enrichedData || []);
      setFilteredTotems(enrichedData || []);

    } catch (error) {
      console.error('Error loading assigned totems:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить присвоенные тотемы',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (totem: AssignedTotem) => {
    setTotemToDelete(totem);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!totemToDelete) return;

    setDeleting(true);

    try {
      const { error } = await supabase
        .from('user_totems')
        .delete()
        .eq('id', totemToDelete.id);

      if (error) throw error;

      // Логируем удаление
      await supabase.from('audit_log').insert({
        action: 'ADMIN_ACTION',
        table_name: 'user_totems',
        record_id: totemToDelete.id,
      });

      toast({
        title: 'Успешно',
        description: 'Тотем удален',
      });

      // Обновляем список
      await loadAssignedTotems();

    } catch (error: any) {
      console.error('Error deleting totem:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить тотем',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setTotemToDelete(null);
    }
  };

  const getUserName = (totem: AssignedTotem) => {
    return totem.profiles.display_name || 
      `${totem.profiles.first_name} ${totem.profiles.last_name}`;
  };

  const getAssignedByName = (totem: AssignedTotem) => {
    if (!totem.assigned_by_profile) return 'Система';
    return totem.assigned_by_profile.display_name ||
      `${totem.assigned_by_profile.first_name} ${totem.assigned_by_profile.last_name}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-kamp-accent" />
              Присвоенные тотемы ({filteredTotems.length})
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени участника или тотему..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredTotems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'Ничего не найдено' : 'Тотемы еще не присвоены'}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Участник</TableHead>
                    <TableHead>Тотем</TableHead>
                    <TableHead>Дисциплина</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead>Присвоил</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTotems.map((totem) => (
                    <TableRow key={totem.id}>
                      <TableCell className="font-medium">
                        {getUserName(totem)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TotemIcon
                            iconName={totem.totems.icon_name}
                            color={totem.totems.icon_color || '#e60000'}
                            className="h-6 w-6"
                          />
                          <div>
                            <div className="font-medium">{totem.totems.name}</div>
                            {totem.is_manual && (
                              <Badge variant="outline" className="text-xs mt-1">
                                Вручную
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {totem.totems.discipline}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(totem.assigned_at), 'dd.MM.yyyy', { locale: ru })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {getAssignedByName(totem)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(totem)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить присвоенный тотем?</AlertDialogTitle>
            <AlertDialogDescription>
              {totemToDelete && (
                <>
                  Вы собираетесь удалить тотем <strong>{totemToDelete.totems.name}</strong> у участника{' '}
                  <strong>{getUserName(totemToDelete)}</strong>.
                  <br /><br />
                  Это действие нельзя отменить.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Удаление...
                </>
              ) : (
                'Удалить'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
