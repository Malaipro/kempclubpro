import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

const GAME_STORAGE_KEYS = [
  'kemp-game-state',
  'kemp-visits',
  'kemp-rolls',
  'kemp-reflections',
];

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('KEMP application failed to render', error, info);
  }

  private resetSavedGame = () => {
    try {
      GAME_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    } finally {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="grid min-h-dvh place-items-center bg-ink px-6 text-bone">
        <section className="max-w-sm text-center">
          <p className="mb-3 font-heading text-2xl">Игра не смогла открыться</p>
          <p className="mb-6 text-sm leading-relaxed text-muted">
            В Telegram могли остаться данные от предыдущей версии. Их можно очистить
            и запустить путь заново.
          </p>
          <button
            type="button"
            className="min-h-touch rounded-card border border-bronze px-6 py-3 font-semibold text-bronze"
            onClick={this.resetSavedGame}
          >
            Очистить и перезапустить
          </button>
        </section>
      </main>
    );
  }
}
