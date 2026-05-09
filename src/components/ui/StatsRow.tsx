import { useGetColonyStats } from "@/lib/api-client-react";

export function StatsRow() {
  const { data: stats } = useGetColonyStats({
    query: {
      refetchInterval: 5000,
    }
  });

  if (!stats) return null;

  return (
    <div className="pointer-events-auto grid grid-cols-4 gap-4 mb-4" data-testid="stats-row">
      <StatBox label="TASKS DONE" value={stats.completedTasks.toString()} />
      <StatBox label="ACTIVE AGENTS" value={stats.activeAgents.toString()} />
      <StatBox label="COLONY HEALTH" value={`${stats.colonyHealth}%`} />
      <StatBox label="AVG ENERGY" value={`${Math.round(stats.averageEnergy)}%`} />
    </div>
  );
}

function StatBox({ label, value }: { label: string, value: string }) {
  return (
    <div className="backdrop-blur-md bg-card/80 border border-primary/20 p-3 rounded-lg flex flex-col items-center justify-center shadow-[0_0_10px_rgba(0,212,255,0.05)]">
      <span className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{label}</span>
      <span className="text-xl font-bold text-primary font-mono">{value}</span>
    </div>
  );
}
