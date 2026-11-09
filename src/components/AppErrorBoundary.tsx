import { Component, type ErrorInfo, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

type Props = { children: ReactNode };
type State = { failed: boolean };

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Falha não tratada na interface DGSCI', error, info);
    if (supabase) {
      void supabase.rpc('log_client_error', {
        p_source: window.location.pathname,
        p_message: error.message.slice(0, 1000),
        p_context: { component_stack: info.componentStack?.slice(0, 3000) ?? '' },
      });
    }
  }

  render() {
    if (this.state.failed) return <main className="session-failure" role="alert"><section><h1>Não foi possível exibir esta página</h1><p>A falha foi registrada. Atualize a página para tentar novamente.</p><button type="button" onClick={() => window.location.reload()}>Atualizar página</button></section></main>;
    return this.props.children;
  }
}
