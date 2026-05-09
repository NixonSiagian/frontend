import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useEffect, memo } from "react";
import { useColonyStore } from "@/store/colony";
import PhaserGame from "@/components/PhaserGame";
import { FloatingHUD } from "@/components/ui/FloatingHUD";
import { useGetWorldState } from "@/lib/api-client-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

// Memoized so parent re-renders don't cascade down into Phaser
const PhaserGameMemo = memo(PhaserGame);
const FloatingHUDMemo = memo(FloatingHUD);

function useWorldStateSync() {
  const { data: worldState } = useGetWorldState({
    query: { refetchOnWindowFocus: false, staleTime: Infinity },
  });

  useEffect(() => {
    if (worldState) {
      useColonyStore.getState().setWorldState(worldState);
    }
  }, [worldState]); // stable: only re-runs when worldState reference changes
}

function Colony() {
  useWorldStateSync();

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden" style={{ background: '#b8a888' }}>
      <PhaserGameMemo />
      <FloatingHUDMemo />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Colony} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
