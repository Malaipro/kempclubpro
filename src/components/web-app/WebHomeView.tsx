import React from 'react';
import { ChevronRight, Coins, Trophy, User, Share2, Star, Users, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { proxyStorageUrl } from '@/lib/storageUrl';
import type { ParticipantFullState } from '@/services/participantService';
import athlete from '@/assets/app-home-athlete.jpg';
import coin from '@/assets/app-home-coin.jpg';
import trophy from '@/assets/app-home-trophy.jpg';
import chat from '@/assets/app-tile-chat.jpg';
import nutrition from '@/assets/app-tile-nutrition.jpg';
import activities from '@/assets/app-tile-activities.jpg';
import ascetics from '@/assets/app-tile-ascetics.jpg';
import homework from '@/assets/app-tile-homework.jpg';
import rating from '@/assets/app-tile-rating.jpg';
import shop from '@/assets/app-tile-shop.jpg';
import challenges from '@/assets/app-tile-challenges.jpg';
import checkpoint from '@/assets/app-tile-checkpoint.jpg';
import rules from '@/assets/app-tile-rules.jpg';
import journal from '@/assets/app-tile-journal.jpg';
import pyramid from '@/assets/app-tile-pyramid.jpg';

const TILE_IMAGES: Record<string, string> = {
  chat, nutrition, activities, ascetics, homework, rating, shop, challenges,
  checkpoint, rules, journal, pyramid,
  history: homework, mastermind_business: rating, mastermind_personal: activities,
};

export const WebHomeTile: React.FC<{
  section: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ section, icon, label, onClick }) => (
  <Button variant="ghost" onClick={onClick} className="photo-home-tile" aria-label={label}>
    <img src={TILE_IMAGES[section]} alt="" width={512} height={480} loading="lazy" className="photo-tile-image" />
    <span className="photo-tile-icon" aria-hidden="true">{icon}</span>
    <span className="photo-tile-label">{label}</span>
    <ChevronRight className="photo-tile-arrow" aria-hidden="true" />
  </Button>
);

const STATUS_LABELS: Record<string, string> = {
  intensive_active: 'Интенсив', club_resident: 'Резидент клуба',
  intensive_completed: 'Интенсив завершён', alumni: 'Выпускник',
};

export const WebHomeView: React.FC<{
  data: ParticipantFullState;
  onProfile: () => void;
  onCoins: () => void;
  onPoints: () => void;
  tiles: React.ReactNode;
}> = ({ data, onProfile, onCoins, onPoints, tiles }) => {
  const { profile, status } = data;
  const displayName = profile?.display_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Участник';
  const referralCode = profile?.referral_code;
  const [copied, setCopied] = React.useState(false);
  const totem = data.current_totem as { name?: string; discipline?: string } | null;
  const homeworkRaw = data.upcoming_homework as { title?: string; deadline?: string | null } | Array<{ title?: string; deadline?: string | null }> | null;
  const upcoming = Array.isArray(homeworkRaw) ? homeworkRaw[0] : homeworkRaw;

  const share = async () => {
    if (!referralCode) return;
    const url = `https://kempclub.pro/join?ref=${encodeURIComponent(referralCode)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'КЭМП', text: 'Присоединяйся к КЭМП', url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      }
    } catch { /* Dismissed sharing dialog. */ }
  };

  return (
    <div className="photo-home">
      <header className="photo-home-banner">
        <img src={athlete} alt="" width={1536} height={1024} fetchPriority="high" className="photo-home-athlete" />
        <div className="photo-home-brand">
          <span className="photo-home-wordmark">КЭМП</span>
          <span className="photo-home-slogan">СИЛЬНЕЕ КАЖДЫЙ ДЕНЬ</span>
        </div>
        <Button variant="ghost" onClick={onProfile} aria-label="Открыть профиль" className="photo-home-profile">
          <span className="photo-home-avatar">
            {profile?.avatar_url ? <img src={proxyStorageUrl(profile.avatar_url)} alt="" width={96} height={96} /> : <User aria-hidden="true" />}
          </span>
          <h1 className="photo-home-name">{displayName}</h1>
          {status && <span className="photo-home-status">{STATUS_LABELS[status] ?? status}</span>}
        </Button>
      </header>

      <div className="photo-home-content">
        <div className="photo-home-stats">
          <Button variant="ghost" onClick={onCoins} className="photo-glass photo-home-stat" aria-label={`Коины: ${data.coins_balance ?? 0}. Открыть магазин`}>
            <img src={coin} alt="" width={576} height={576} className="photo-stat-art" />
            <span className="photo-stat-icon"><Coins aria-hidden="true" /></span>
            <span className="photo-stat-copy"><span className="photo-stat-caption">Коины</span><span className="photo-stat-value">{data.coins_balance ?? 0}</span></span>
            <ChevronRight className="photo-stat-arrow" aria-hidden="true" />
          </Button>
          <Button variant="ghost" onClick={onPoints} className="photo-glass photo-home-stat" aria-label={`Очки: ${data.total_points ?? 0}. Открыть рейтинг`}>
            <img src={trophy} alt="" width={576} height={576} className="photo-stat-art" />
            <span className="photo-stat-icon"><Trophy aria-hidden="true" /></span>
            <span className="photo-stat-copy"><span className="photo-stat-caption">Очки</span><span className="photo-stat-value">{data.total_points ?? 0}</span></span>
            <ChevronRight className="photo-stat-arrow" aria-hidden="true" />
          </Button>
        </div>

        {referralCode && <div className="photo-glass photo-home-referral">
          <div className="min-w-0"><p className="photo-stat-caption">Реферальный код</p><p className="photo-referral-code">{referralCode}</p></div>
          <Button variant="outline" size="sm" className="photo-share" onClick={share}><Share2 className="h-4 w-4" />{copied ? 'Скопировано' : 'Поделиться'}</Button>
        </div>}

        <div className="photo-home-tiles grid grid-cols-3 gap-2.5">{tiles}</div>

        {(data.rank_position != null || (data.referrals_count ?? 0) > 0) && <div className="photo-home-secondary">
          {data.rank_position != null && <span><Star className="h-4 w-4" /> Место в рейтинге <strong>#{data.rank_position}</strong></span>}
          {(data.referrals_count ?? 0) > 0 && <span><Users className="h-4 w-4" /> Рефералы <strong>{data.referrals_count}</strong></span>}
        </div>}
        {totem?.name && <div className="photo-home-detail"><p className="photo-stat-caption">Тотем{(data.totems_count ?? 0) > 1 ? ` (${data.totems_count} всего)` : ''}</p><p className="font-semibold">{totem.name}</p>{totem.discipline && <p className="photo-stat-caption">{totem.discipline}</p>}</div>}
        {upcoming?.title && <div className="photo-home-detail flex items-start gap-3"><BookOpen className="h-5 w-5 shrink-0" /><div><p className="photo-stat-caption">Ближайшее ДЗ</p><p className="font-semibold">{upcoming.title}</p>{upcoming.deadline && <p className="photo-stat-caption">До {new Date(upcoming.deadline).toLocaleDateString('ru-RU')}</p>}</div></div>}
      </div>
    </div>
  );
};