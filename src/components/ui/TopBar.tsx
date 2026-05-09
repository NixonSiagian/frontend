import { useColonyStore } from "@/store/colony";
import { useGetColonyStats, useHealthCheck } from "@/lib/api-client-react";
import { Badge } from "@/components/ui/badge";

export function TopBar() {
  const worldTime = useColonyStore((state) => state.worldTime);
  const agents = useColonyStore((state) => state.agents);
  const activeAgentsCount = agents.filter(a => a.state !== "sleeping" && a.state !== "idle").length;

  const { data: stats } = useGetColonyStats({
    query: {
      refetchInterval: 5000,
    }
  });

  const { data: health } = useHealthCheck({
    query: {
      refetchInterval: 10000,
    }
  });

  const healthColor = stats?.colonyHealth && stats.colonyHealth > 80 ? "text-green-400" 
    : stats?.colonyHealth && stats.colonyHealth > 50 ? "text-yellow-400" : "text-red-400";

  return (
    <header className="pointer-events-auto backdrop-blur-md bg-card/80 border border-primary/20 p-4 rounded-lg flex items-center justify-between w-full shadow-[0_0_15px_rgba(0,212,255,0.1)]" data-testid="header-topbar">
      <div className="flex items-center space-x-6">
        <h1 className="text-2xl font-black text-primary tracking-widest drop-shadow-[0_0_8px_rgba(0,212,255,0.8)] uppercase">
          AI COLONY OS
        </h1>
        <Badge variant="outline" className="border-primary/50 text-primary font-mono text-sm tracking-widest">
          {worldTime || "00:00"}
        </Badge>
      </div>

      <div className="flex items-center space-x-6 font-mono text-sm">
        <div className="flex items-center space-x-2">
          <span className="text-muted-foreground uppercase">SYSTEM:</span>
          <span className={`${health?.status === "ok" ? "text-green-400" : "text-red-400"} uppercase`}>
            {health?.status || "UNKNOWN"}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-muted-foreground uppercase">COLONY HEALTH:</span>
          <span className={`${healthColor}`}>
            {stats?.colonyHealth || 0}%
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-muted-foreground uppercase">ACTIVE AGENTS:</span>
          <span className="text-primary">
            {activeAgentsCount} / {agents.length || 8}
          </span>
        </div>
      </div>
    </header>
  );
}
