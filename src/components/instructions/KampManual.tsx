import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, Users, Database, Trophy, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const KampManual: React.FC = () => {
  const [contentBlocks, setContentBlocks] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchContentBlocks();
  }, []);

  const fetchContentBlocks = async () => {
    try {
      const { data } = await supabase
        .from('content_blocks')
        .select('*')
        .in('block_key', [
          'kamp_manual_title',
          'kamp_manual_subtitle',
          'kamp_manual_important',
          'kamp_manual_db_structure',
          'kamp_manual_activities',
          'kamp_manual_totems',
          'kamp_manual_roles',
          'kamp_manual_multipliers'
        ])
        .eq('is_active', true);

      const blocks = (data || []).reduce((acc, block) => {
        acc[block.block_key] = block;
        return acc;
      }, {});
      
      setContentBlocks(blocks);
    } catch (error) {
      console.error('Error fetching content blocks:', error);
    }
  };

  const getBlockContent = (key: string, fallback: string) => {
    return contentBlocks[key]?.content || fallback;
  };

  const getBlockTitle = (key: string, fallback: string) => {
    return contentBlocks[key]?.title || fallback;
  };

  return (
    <div className="space-y-8">
      <Card className="kamp-card">
        <CardHeader>
          <CardTitle className="text-2xl text-kamp-accent flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            {getBlockTitle('kamp_manual_title', 'Инструкция по заполнению системы КЭМП')}
          </CardTitle>
          <p className="text-gray-400">{getBlockContent('kamp_manual_subtitle', 'Подробное руководство для тренеров и кураторов')}</p>
        </CardHeader>
        <CardContent className="space-y-8">
          
          <Alert className="border-kamp-accent/50 bg-kamp-accent/10">
            <Trophy className="h-4 w-4 text-kamp-accent" />
            <AlertDescription className="text-kamp-accent" dangerouslySetInnerHTML={{
              __html: getBlockContent('kamp_manual_important', '<strong>Важно!</strong> После переименования таблиц на русский язык, тотемы теперь рассчитываются автоматически при добавлении новых активностей.')
            }} />
          </Alert>

          <div>
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Database className="w-5 h-5" />
              {getBlockTitle('kamp_manual_db_structure', 'Структура базы данных')}
            </h3>
            
            <div className="text-gray-300" dangerouslySetInnerHTML={{
              __html: getBlockContent('kamp_manual_db_structure', `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <h4 class="text-lg text-kamp-accent mb-3">Основные таблицы</h4>
                    <div class="space-y-3">
                      <div class="flex justify-between items-center">
                        <span class="text-gray-300">участники</span>
                        <span class="px-2 py-1 bg-gray-600 rounded text-xs">Пользователи</span>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class="text-gray-300">кэмп_активности</span>
                        <span class="px-2 py-1 bg-gray-600 rounded text-xs">Закалы/Грани/Шрамы</span>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class="text-gray-300">тотемы_участников</span>
                        <span class="px-2 py-1 bg-gray-600 rounded text-xs">Полученные тотемы</span>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class="text-gray-300">требования_тотемов</span>
                        <span class="px-2 py-1 bg-gray-600 rounded text-xs">Условия тотемов</span>
                      </div>
                    </div>
                  </div>
                  <div class="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <h4 class="text-lg text-kamp-accent mb-3">Аскезы</h4>
                    <div class="space-y-3">
                      <div class="flex justify-between items-center">
                        <span class="text-gray-300">аскезы_участников</span>
                        <span class="px-2 py-1 bg-gray-600 rounded text-xs">Созданные аскезы</span>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class="text-gray-300">прогресс_аскез</span>
                        <span class="px-2 py-1 bg-gray-600 rounded text-xs">Ежедневный прогресс</span>
                      </div>
                    </div>
                  </div>
                </div>
              `).replace(/\n\s+/g, '')
            }} />
          </div>

          <div>
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Как заполнять активности
            </h3>
            
            <div className="space-y-6">
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <h4 className="font-semibold text-blue-400 mb-3">Закалы (физические тренировки)</h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <p><strong>Тип награды:</strong> zakal</p>
                  <p><strong>Подтипы:</strong> bjj (БЖЖ), kick (Кикбоксинг), ofp (ОФП)</p>
                  <p><strong>Базовые баллы:</strong> 1</p>
                  <p><strong>Пример заполнения:</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Тип: zakal, Подтип: bjj → За тренировку БЖЖ</li>
                    <li>Тип: zakal, Подтип: kick → За тренировку кикбоксинга</li>
                    <li>Тип: zakal, Подтип: ofp → За тренировку ОФП</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                <h4 className="font-semibold text-green-400 mb-3">Грани (теория и ментальные практики)</h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <p><strong>Тип награды:</strong> gran</p>
                  <p><strong>Подтипы:</strong> не требуется</p>
                  <p><strong>Базовые баллы:</strong> 1</p>
                  <p><strong>За что выдается:</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Лекции по Пирамиде КЭМП</li>
                    <li>Домашние задания по Пирамиде КЭМП</li>
                    <li>Лекции по нутрициологии</li>
                    <li>Домашние задания по нутрициологии</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                <h4 className="font-semibold text-red-400 mb-3">Шрамы (испытания и зачеты)</h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <p><strong>Тип награды:</strong> shram</p>
                  <p><strong>Подтипы:</strong> bjj, kick, ofp, tactics</p>
                  <p><strong>Базовые баллы:</strong> 6-8 (зависит от испытания)</p>
                  <p><strong>Конкретные баллы:</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>shram + bjj = 6 баллов (краш-тест БЖЖ)</li>
                    <li>shram + kick = 6 баллов (краш-тест кикбоксинг)</li>
                    <li>shram + ofp = 8 баллов (Гонка героев)</li>
                    <li>shram + tactics = 3 балла (тактический выезд)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-white mb-4">Автоматический расчет тотемов</h3>
            
            <div className="space-y-4">
              <Alert className="border-green-500/50 bg-green-500/10">
                <Trophy className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-400">
                  <strong>Автоматика:</strong> Тотемы проверяются и присуждаются автоматически после каждого добавления активности в таблицу "кэмп_активности".
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-kamp-accent">Физические тотемы</h4>
                  <div className="space-y-2 text-sm">
                    <div className="p-3 bg-gray-800/30 rounded">
                      <p><strong>🐍 Змей (БЖЖ):</strong></p>
                      <p className="text-gray-400">≥8 Закал-БЖЖ + 1 Шрам-БЖЖ</p>
                    </div>
                    <div className="p-3 bg-gray-800/30 rounded">
                      <p><strong>🐾 Лапа (Кик):</strong></p>
                      <p className="text-gray-400">≥8 Закал-Кик + 1 Шрам-Кик</p>
                    </div>
                    <div className="p-3 bg-gray-800/30 rounded">
                      <p><strong>🔨 Молот (ОФП):</strong></p>
                      <p className="text-gray-400">≥8 Закал-ОФП + 1 Шрам-ОФП</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-kamp-accent">Специальные тотемы</h4>
                  <div className="space-y-2 text-sm">
                    <div className="p-3 bg-gray-800/30 rounded">
                      <p><strong>⚔️ Клинок (Испытания):</strong></p>
                      <p className="text-gray-400">Все три шрама: БЖЖ + Кик + ОФП</p>
                    </div>
                    <div className="p-3 bg-gray-800/30 rounded">
                      <p><strong>⭐ Звезда:</strong></p>
                      <p className="text-gray-400">6 лекций + 6 ДЗ (Пирамида КЭМП)</p>
                    </div>
                    <div className="p-3 bg-gray-800/30 rounded">
                      <p><strong>🧘 Монах:</strong></p>
                      <p className="text-gray-400">2 аскезы × 14 дней ≥85%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Роли и ответственности
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-kamp-accent">Тренер</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-300 space-y-2">
                  <p>• Принимает зачеты (Шрамы)</p>
                  <p>• Выдает множитель ×1.5</p>
                  <p>• Заполняет активности после тренировок</p>
                  <p>• Подтверждает выполнение испытаний</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-kamp-accent">Куратор</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-300 space-y-2">
                  <p>• Ведет общий учет активностей</p>
                  <p>• Проверяет домашние задания (Грани)</p>
                  <p>• Мониторит аскезы участников</p>
                  <p>• Готовит еженедельные сводки</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-kamp-accent">Участник</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-300 space-y-2">
                  <p>• Отмечается у тренера/куратора</p>
                  <p>• Сдает домашние задания</p>
                  <p>• Ведет аскезы самостоятельно</p>
                  <p>• Следит за прогрессом в ЛК</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <AlertDescription className="text-yellow-400">
              <strong>Множители:</strong> Коэффициент ×1.5 выдается редко, только за сверхусилие по решению тренера. Максимум 2 награды в день на одного участника.
            </AlertDescription>
          </Alert>

        </CardContent>
      </Card>
    </div>
  );
};