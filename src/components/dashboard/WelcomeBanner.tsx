import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle, 
  Circle, 
  Flame, 
  BookOpen, 
  Users, 
  Calendar,
  MessageCircle,
  Dumbbell
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { FIXED_TARGET_DATE } from '@/components/ContactForm';

interface WelcomeBannerProps {
  firstName?: string | null;
  profileData?: {
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    telegram?: string | null;
    date_of_birth?: string | null;
    height_cm?: number | null;
    weight_kg?: number | null;
    personal_data_consent?: boolean | null;
  } | null;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ firstName, profileData }) => {
  const name = firstName || 'Боец';
  const startDate = format(FIXED_TARGET_DATE, 'd MMMM', { locale: ru });

  // Profile completion checklist
  const checklistItems = [
    { label: 'Имя и фамилия', done: !!(profileData?.first_name && profileData?.last_name) },
    { label: 'Телефон', done: !!profileData?.phone },
    { label: 'Дата рождения', done: !!profileData?.date_of_birth },
    { label: 'Telegram', done: !!profileData?.telegram },
    { label: 'Рост и вес', done: !!(profileData?.height_cm && profileData?.weight_kg) },
    { label: 'Согласие на обработку данных', done: !!profileData?.personal_data_consent },
  ];

  const completedCount = checklistItems.filter(i => i.done).length;
  const allDone = completedCount === checklistItems.length;

  return (
    <div className="space-y-6 mb-8">
      {/* Welcome Card */}
      <Card className="bg-gradient-to-br from-kamp-accent/20 to-kamp-primary/10 border-kamp-accent/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-kamp-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Flame className="w-6 h-6 text-kamp-accent" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Добро пожаловать в КЭМП, {name}! 🔥
              </h2>
              <p className="text-muted-foreground">
                Интенсив стартует <span className="text-kamp-accent font-semibold">{startDate}</span>. 
                Ниже — всё что нужно знать и подготовить до старта.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Instructions for newcomers */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-kamp-accent" />
              Что тебя ждёт
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InstructionItem 
              icon={<Dumbbell className="w-4 h-4" />}
              title="Тренировки"
              description="Кикбоксинг, джиу-джитсу, ОФП — 3-4 раза в неделю"
            />
            <InstructionItem 
              icon={<Calendar className="w-4 h-4" />}
              title="Расписание"
              description="Смотри во вкладке «Расписание» в ЛК"
            />
            <InstructionItem 
              icon={<Users className="w-4 h-4" />}
              title="Рейтинг"
              description="За каждую тренировку — баллы. Лидеры получают бонусы"
            />
            <InstructionItem 
              icon={<MessageCircle className="w-4 h-4" />}
              title="Связь"
              description="Чат в Telegram — добавим после старта потока"
            />
          </CardContent>
        </Card>

        {/* Profile checklist */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-kamp-accent" />
              Чек-лист профиля
              <span className="text-sm font-normal text-muted-foreground ml-auto">
                {completedCount}/{checklistItems.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allDone ? (
              <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <p className="text-sm text-green-400 font-medium">Профиль полностью заполнен! Ты готов к старту 💪</p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {checklistItems.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    {item.done ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={item.done ? 'text-muted-foreground line-through' : 'text-foreground'}>
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const InstructionItem: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 text-kamp-accent">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  </div>
);
