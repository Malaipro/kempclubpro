import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Book, Zap, Star, DropletIcon, Utensils, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const KampInstructions: React.FC = () => {
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
          'kamp_instructions_title',
          'kamp_instructions_subtitle', 
          'kamp_gamification_why',
          'kamp_bracelet_info',
          'kamp_quick_rules',
          'kamp_roles_info',
          'kamp_special_totems'
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
  const rewardTypes = [
    {
      icon: <Target className="w-5 h-5" />,
      name: "Закал",
      subtypes: ["БЖЖ", "Кик", "ОФП"],
      description: "За тренировки по физическим дисциплинам",
      points: "+1"
    },
    {
      icon: <Book className="w-5 h-5" />,
      name: "Грань",
      subtypes: ["Пирамида КЭМП", "Нутрициология", "ДЗ по Пирамиде", "ДЗ по Нутрициологии"],
      description: "За теорию и ментальные практики",
      points: "+1"
    },
    {
      icon: <Zap className="w-5 h-5" />,
      name: "Шрам",
      subtypes: ["БЖЖ", "Кик", "ОФП", "Тактика", "Краш-тест БЖЖ", "Краш-тест Кик", "Гонка героев"],
      description: "За испытания и зачёты",
      points: "+1-8"
    },
    {
      icon: <Trophy className="w-5 h-5" />,
      name: "Тотем",
      subtypes: [],
      description: "За полное закрытие направления",
      points: "Символ"
    }
  ];

  const totems = [
    { name: "Змей", direction: "БЖЖ", meaning: "контроль", requirements: "≥8 Закал-БЖЖ + Шрам-БЖЖ", icon: "🐍" },
    { name: "Лапа", direction: "Кикбоксинг", meaning: "удар", requirements: "≥8 Закал-Кик + Шрам-Кик", icon: "🐾" },
    { name: "Молот", direction: "ОФП", meaning: "сила", requirements: "≥8 Закал-ОФП + Шрам-ОФП", icon: "🔨" },
    { name: "Звезда", direction: "Пирамида КЭМП", meaning: "осознанность", requirements: "6 лекций + 6 ДЗ", icon: "⭐" },
    { name: "Росток", direction: "Нутрициология", meaning: "восстановление", requirements: "6 лекций + 6 ДЗ", icon: "🌱" },
    { name: "Компас", direction: "Тактика", meaning: "ориентирование", requirements: "3 выезда (зачёты)", icon: "🧭" },
    { name: "Монах", direction: "Аскезы", meaning: "самоконтроль", requirements: "2 аскезы × 14 дней ≥85%", icon: "🧘" },
    { name: "Клинок", direction: "Испытания", meaning: "шрам", requirements: "Все три шрама: БЖЖ + Кик + ОФП", icon: "⚔️" }
  ];

  const pointsTable = [
    { activity: "Тренировка (любой Закал)", points: "+1", icon: <Target className="w-4 h-4" /> },
    { activity: "Лекция", points: "+1", icon: <Book className="w-4 h-4" /> },
    { activity: "Домашнее задание", points: "+1", icon: <Share2 className="w-4 h-4" /> },
    { activity: "Краш-тест БЖЖ", points: "+6", icon: <Zap className="w-4 h-4" /> },
    { activity: "Краш-тест Кик", points: "+6", icon: <Zap className="w-4 h-4" /> },
    { activity: "Гонка героев", points: "+8", icon: <Trophy className="w-4 h-4" /> },
    { activity: "Тактика (выезд)", points: "+3", icon: <Target className="w-4 h-4" /> },
    { activity: "Аскеза (14 дней)", points: "+4", icon: <Star className="w-4 h-4" /> }
  ];

  return (
    <div className="space-y-8">
      <Card className="kamp-card">
        <CardHeader>
          <CardTitle className="text-2xl text-kamp-accent flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            {getBlockTitle('kamp_instructions_title', 'КЭМП — Полная инструкция по геймификации')}
          </CardTitle>
          <p className="text-gray-400">{getBlockContent('kamp_instructions_subtitle', 'Версия 1.0 (рабочий регламент на 60 дней)')}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Зачем геймификация</h3>
            <div className="text-gray-300" dangerouslySetInnerHTML={{
              __html: getBlockContent('kamp_gamification_why', `
                <ul class="space-y-2">
                  <li><strong>Дисциплина через ясные правила.</strong> Каждый шаг виден: тренировка → отметка → награда.</li>
                  <li><strong>Мотивация и прогресс.</strong> Видимый браслет и таблица лидеров поджигают соревновательность.</li>
                  <li><strong>Единый язык.</strong> Закал, Грань, Шрам, Тотем — простые коды, понятные всем.</li>
                </ul>
              `).replace(/\n\s+/g, '')
            }} />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Браслет участника</h3>
            <div className="text-gray-300" dangerouslySetInnerHTML={{
              __html: getBlockContent('kamp_bracelet_info', `
                <ul class="space-y-2">
                  <li>• Выдаётся <strong>пустой</strong> в начале сезона.</li>
                  <li>• На браслет ставим <strong>только штампы‑тотемы</strong> за закрытие направлений.</li>
                  <li>• Все текущие отметки (тренировки, лекции, тактика и т.п.) <strong>считаются в таблице и отражаются на сайте</strong>.</li>
                </ul>
              `).replace(/\n\s+/g, '')
            }} />
          </div>
        </CardContent>
      </Card>

      <Card className="kamp-card">
        <CardHeader>
          <CardTitle className="text-xl text-kamp-accent">Словарь наград</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rewardTypes.map((reward, index) => (
              <div key={index} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-kamp-accent">{reward.icon}</div>
                  <h4 className="font-semibold text-white">{reward.name}</h4>
                  <Badge variant="outline" className="text-kamp-accent border-kamp-accent">
                    {reward.points}
                  </Badge>
                </div>
                <p className="text-sm text-gray-400 mb-2">{reward.description}</p>
                {reward.subtypes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {reward.subtypes.map((subtype) => (
                      <Badge key={subtype} variant="secondary" className="text-xs">
                        {subtype}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="kamp-card">
        <CardHeader>
          <CardTitle className="text-xl text-kamp-accent">Направления и тотемы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {totems.map((totem, index) => (
              <div key={index} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{totem.icon}</span>
                  <div>
                    <h4 className="font-semibold text-white">{totem.name}</h4>
                    <p className="text-sm text-gray-400">{totem.direction} ({totem.meaning})</p>
                  </div>
                </div>
                <p className="text-sm text-gray-300">{totem.requirements}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="kamp-card">
        <CardHeader>
          <CardTitle className="text-xl text-kamp-accent">Единицы учёта (баллы и множители)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pointsTable.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="text-kamp-accent">{item.icon}</div>
                    <span className="text-sm text-gray-300">{item.activity}</span>
                  </div>
                  <Badge variant="outline" className="text-kamp-accent border-kamp-accent">
                    {item.points}
                  </Badge>
                </div>
              ))}
            </div>
            
            <div className="p-4 bg-kamp-accent/10 rounded-lg border border-kamp-accent/30">
              <h4 className="font-semibold text-kamp-accent mb-2">Множитель ×1.5</h4>
              <p className="text-sm text-gray-300">
                По усмотрению инструктора: <strong>коэффициент ×1.5</strong> к одному событию (редко, за сверхусилие).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="kamp-card">
        <CardHeader>
          <CardTitle className="text-xl text-kamp-accent">Быстрые правила для участника</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-300" dangerouslySetInnerHTML={{
            __html: getBlockContent('kamp_quick_rules', `
              <ol class="space-y-3">
                <li><strong>1.</strong> Пришёл → отметился у тренера/куратора → после тренировки получишь <strong>Закал</strong>.</li>
                <li><strong>2.</strong> Лекция/ДЗ → <strong>Грань</strong>. Делай и показывай куратору.</li>
                <li><strong>3.</strong> Краш‑тест/гонка/тактика → <strong>Шрам</strong>. Готовься, не прогуливай.</li>
                <li><strong>4.</strong> Закрыл все требования направления → <strong>Тотем</strong>.</li>
                <li><strong>5.</strong> Максимум 2 награды в день для защиты от травм.</li>
              </ol>
            `).replace(/\n\s+/g, '')
          }} />
        </CardContent>
      </Card>

      <Card className="kamp-card">
        <CardHeader>
          <CardTitle className="text-xl text-kamp-accent">Роли</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-300" dangerouslySetInnerHTML={{
            __html: getBlockContent('kamp_roles_info', `
              <div class="space-y-4">
                <div class="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h4 class="font-semibold text-white mb-2">Тренер</h4>
                  <p class="text-sm text-gray-300">Принимает зачёты, выдаёт множитель ×1.5, вносит особые отметки.</p>
                </div>
                <div class="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h4 class="font-semibold text-white mb-2">Куратор</h4>
                  <p class="text-sm text-gray-300">Ведёт учёт, проверяет ДЗ, фиксирует аскезы и трекеры, готовит еженедельную сводку.</p>
                </div>
                <div class="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h4 class="font-semibold text-white mb-2">Участник</h4>
                  <p class="text-sm text-gray-300">Отмечается у тренера/куратора в таблице, сдаёт ДЗ, хранит браслет как паспорт прогресса.</p>
                </div>
              </div>
            `).replace(/\n\s+/g, '')
          }} />
        </CardContent>
      </Card>

      <Card className="kamp-card">
        <CardHeader>
          <CardTitle className="text-xl text-kamp-accent">Особые тотемы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-300" dangerouslySetInnerHTML={{
            __html: getBlockContent('kamp_special_totems', `
              <div class="space-y-4">
                <div class="flex items-center gap-3 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                  <span class="text-2xl">🏮</span>
                  <div>
                    <h4 class="font-semibold text-yellow-400">Маяк</h4>
                    <p class="text-sm text-gray-300">За вклад/служение клубу; присуждается по решению руководителя клуба.</p>
                  </div>
                </div>
                <div class="flex items-center gap-3 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <span class="text-2xl">🐻</span>
                  <div>
                    <h4 class="font-semibold text-purple-400">Медведь</h4>
                    <p class="text-sm text-gray-300">Супер‑тотем за особые достижения; присуждается по решению руководителя клуба.</p>
                  </div>
                </div>
              </div>
            `).replace(/\n\s+/g, '')
          }} />
        </CardContent>
      </Card>
    </div>
  );
};