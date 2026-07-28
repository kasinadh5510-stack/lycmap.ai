import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AppShell } from '@/components/layout/app-shell';

import Home from '@/pages/home';
import QuizSetup from '@/pages/quiz-setup';
import QuizActive from '@/pages/quiz-active';
import QuizResults from '@/pages/quiz-results';
import Stats from '@/pages/stats';
import Chat from '@/pages/chat';

function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-bold text-gradient-electric mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-8">Page not found</p>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/quiz" component={QuizSetup} />
      <Route path="/quiz/:id" component={QuizActive} />
      <Route path="/quiz/:id/results" component={QuizResults} />
      <Route path="/stats" component={Stats} />
      <Route path="/chat" component={Chat} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Ensure dark mode class is applied (fallback if not in index.css layer base)
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('dark');
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AppShell>
            <Router />
          </AppShell>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
