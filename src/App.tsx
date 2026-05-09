import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useEffect, memo } from "react";
import { io } from "socket.io-client";
import { useColonyStore } from "@/store/colony";
import PhaserGame from "@/components/PhaserGame";
import { FloatingHUD } from "@/components/ui/FloatingHUD";
import { useGetWorldState } from "@workspace/api-client-react";

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

function useSocketSync() {
  useEffect(() => {
    const socket = io({ path: "/api/socket.io", transports: ["polling", "websocket"] });

    socket.on("agentTick", (data: { updates: any[]; tickCount: number }) => {
      useColonyStore.getState().updateAgentTick(data.updates, data.tickCount);
    });

    socket.on("agentUpdate", (agent: any) => {
      useColonyStore.getState().updateAgent(agent);
    });

    socket.on("worldEvent", (event: any) => {
      useColonyStore.getState().addEvent(event);
    });

    socket.on("taskUpdate", (data: any) => {
      useColonyStore.getState().updateTask(data.id, data);
    });

    socket.on("fileCreated", (data: { taskId: string; filename: string }) => {
      useColonyStore.getState().addWorkspaceFile(data.taskId, data.filename);
    });

    socket.on("taskLog", (data: { taskId: string; line: string }) => {
      useColonyStore.getState().appendTaskLog(data.taskId, data.line);
    });

    return () => {
      socket.disconnect();
    };
  }, []); // Empty deps — socket created exactly once
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
  useSocketSync();
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
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
