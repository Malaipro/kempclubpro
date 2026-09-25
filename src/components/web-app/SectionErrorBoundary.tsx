import React from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  onHome: () => void;
  children: React.ReactNode;
}

interface BoundaryState {
  error: Error | null;
}

// Ловит ошибки рендера раздела, чтобы вместо белого экрана показать сообщение
// и оставить пользователю навигацию.
export class SectionErrorBoundary extends React.Component<Props, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[WebApp] section render error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-destructive">Не удалось показать раздел</p>
        <p className="text-xs text-muted-foreground break-words max-w-full">{this.state.error.message}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => this.setState({ error: null })}>Повторить</Button>
          <Button variant="ghost" onClick={this.props.onHome}>На главную</Button>
        </div>
      </div>
    );
  }
}
