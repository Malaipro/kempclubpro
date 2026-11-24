interface PassportScreenProps {
  stats: {
    currentCell: number;
    status: string;
    daysInPath: number;
    totalVisits: number;
    uniqueCells: number;
    totalRolls: number;
    supports: number;
    breakdowns: number;
    nodes: number;
    bonusCredits: number;
  } | null;
  onNewGame: () => void;
}

export function PassportScreen({ stats, onNewGame }: PassportScreenProps) {
  if (!stats) return null;

  return (
    <div className="py-4">
      <h2 className="font-heading text-display text-bronze mb-6 text-center">
        ПАСПОРТ ПУТИ
      </h2>

      <div className="bg-graphite rounded-card p-4 border border-bronze/30 mb-6">
        <p className="text-caption text-muted mb-1">Статус</p>
        <p className="font-heading text-h1 text-bone">
          {stats.status === 'finished' ? 'Путь завершён' : 'В пути'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-graphite rounded-card p-3 border border-copper/10">
          <p className="text-caption text-muted">Клетка</p>
          <p className="font-heading text-h1 text-bone">{stats.currentCell}</p>
        </div>
        <div className="bg-graphite rounded-card p-3 border border-copper/10">
          <p className="text-caption text-muted">Дней в пути</p>
          <p className="font-heading text-h1 text-bone">{stats.daysInPath}</p>
        </div>
        <div className="bg-graphite rounded-card p-3 border border-copper/10">
          <p className="text-caption text-muted">Визитов</p>
          <p className="font-heading text-h1 text-bone">{stats.totalVisits}</p>
        </div>
        <div className="bg-graphite rounded-card p-3 border border-copper/10">
          <p className="text-caption text-muted">Уникальных клеток</p>
          <p className="font-heading text-h1 text-bone">{stats.uniqueCells} / 72</p>
        </div>
        <div className="bg-graphite rounded-card p-3 border border-copper/10">
          <p className="text-caption text-muted">Бросков</p>
          <p className="font-heading text-h1 text-bone">{stats.totalRolls}</p>
        </div>
        <div className="bg-graphite rounded-card p-3 border border-copper/10">
          <p className="text-caption text-muted">Узлов</p>
          <p className="font-heading text-h1 text-bone">{stats.nodes}</p>
        </div>
        <div className="bg-graphite rounded-card p-3 border border-olive/30">
          <p className="text-caption text-olive">Опор</p>
          <p className="font-heading text-h1 text-olive">{stats.supports}</p>
        </div>
        <div className="bg-graphite rounded-card p-3 border border-red/30">
          <p className="text-caption text-red">Срывов</p>
          <p className="font-heading text-h1 text-red">{stats.breakdowns}</p>
        </div>
      </div>

      {stats.status === 'finished' && (
        <div className="bg-olive/10 rounded-card p-4 border border-olive/30 mb-6">
          <p className="text-body text-bone text-center leading-relaxed">
            Ты достиг Опоры. Путь пройден. Но путь мужчины не имеет конца — только новые витки.
          </p>
        </div>
      )}

      <button
        onClick={onNewGame}
        className="w-full min-h-cta bg-bronze text-ink font-heading text-h2 rounded-card hover:opacity-90 transition-opacity"
      >
        {stats.status === 'finished' ? 'Новый Путь' : 'Начать заново'}
      </button>
    </div>
  );
}
