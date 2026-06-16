import React from 'react';
import { AlertCircle, Link2Off, Clock, Server, Wifi } from 'lucide-react';

export type NoAccessReason =
  | 'not_linked'
  | 'invalid_init_data'
  | 'init_data_expired'
  | 'missing_init_data'
  | 'missing_user'
  | 'rpc_error'
  | 'no_webapp'
  | 'network_error';

interface Props {
  reason: NoAccessReason;
}

interface Content {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const CONTENT: Record<NoAccessReason, Content> = {
  not_linked: {
    icon: <Link2Off className="w-8 h-8 text-muted-foreground" />,
    title: 'Аккаунт не привязан',
    description:
      'Ваш Telegram не связан ни с одним профилем КЭМП. Обратитесь к администратору для привязки.',
  },
  invalid_init_data: {
    icon: <AlertCircle className="w-8 h-8 text-destructive" />,
    title: 'Ошибка авторизации',
    description: 'Не удалось проверить подпись Telegram. Попробуйте закрыть и снова открыть приложение.',
  },
  init_data_expired: {
    icon: <Clock className="w-8 h-8 text-muted-foreground" />,
    title: 'Сессия устарела',
    description: 'Данные авторизации истекли. Закройте приложение и откройте его снова.',
  },
  missing_init_data: {
    icon: <AlertCircle className="w-8 h-8 text-destructive" />,
    title: 'Нет данных Telegram',
    description: 'Откройте это приложение через Telegram.',
  },
  missing_user: {
    icon: <AlertCircle className="w-8 h-8 text-destructive" />,
    title: 'Не удалось определить пользователя',
    description: 'Данные пользователя Telegram не найдены. Попробуйте перезапустить приложение.',
  },
  rpc_error: {
    icon: <Server className="w-8 h-8 text-destructive" />,
    title: 'Ошибка сервера',
    description: 'Не удалось загрузить данные. Попробуйте позже.',
  },
  no_webapp: {
    icon: <AlertCircle className="w-8 h-8 text-muted-foreground" />,
    title: 'Откройте в Telegram',
    description: 'Это приложение работает только внутри Telegram Mini App.',
  },
  network_error: {
    icon: <Wifi className="w-8 h-8 text-destructive" />,
    title: 'Нет соединения',
    description: 'Проверьте интернет и попробуйте снова.',
  },
};

export const TelegramNoAccess: React.FC<Props> = ({ reason }) => {
  const { icon, title, description } = CONTENT[reason];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 gap-6">
      <div className="w-16 h-16 rounded-2xl bg-kamp-primary flex items-center justify-center">
        <span className="text-white text-2xl font-black">K</span>
      </div>

      <div className="flex flex-col items-center gap-3 text-center max-w-xs">
        {icon}
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
};
