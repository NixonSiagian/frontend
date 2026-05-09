import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useEffect, memo, useCallback, useState, Component, type ErrorInfo, type ReactNode } from "react";
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

class RuntimeErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("Unhandled runtime error:", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#b8a888] p-6">
          <div className="max-w-md rounded-lg border border-black/15 bg-white/90 p-5 text-center text-[#2c1e0f]">
            <h1 className="text-lg font-semibold">Unable to render app</h1>
            <p className="mt-2 text-sm">A runtime error occurred while loading this page.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function PhaserFallback({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#b8a888] p-6" style={{ zIndex: 10 }}>
      <div className="max-w-md rounded-lg border border-black/15 bg-white/90 p-5 text-center text-[#2c1e0f]">
        <h2 className="text-lg font-semibold">Simulation unavailable</h2>
        <p className="mt-2 text-sm">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-md border border-black/20 bg-white px-3 py-1 text-sm font-medium hover:bg-white/80"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

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
  const [phaserError, setPhaserError] = useState<string | null>(null);
  const [phaserRenderKey, setPhaserRenderKey] = useState(0);

  const handlePhaserError = useCallback((error: Error) => {
    setPhaserError(error.message || "Failed to initialize Phaser.");
  }, []);

  const handleRetry = useCallback(() => {
    setPhaserError(null);
    setPhaserRenderKey((value) => value + 1);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden" style={{ background: '#b8a888' }}>
      {!phaserError ? (
        <>
          <PhaserGameMemo key={phaserRenderKey} onError={handlePhaserError} />
          <FloatingHUDMemo />
        </>
      ) : (
        <PhaserFallback message={phaserError} onRetry={handleRetry} />
      )}
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
  const baseUrl = typeof import.meta.env.BASE_URL === "string" ? import.meta.env.BASE_URL : "/";
  const routerBase = baseUrl.replace(/\/$/, "") || "/";

  return (
    <RuntimeErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={routerBase}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </RuntimeErrorBoundary>
  );
}
