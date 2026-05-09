import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Agent {
  id: string;
  name: string;
  role: string;
  state: string;
  mood: string;
  energy: number;
  stress: number;
  personality: string;
  roomId: string;
  posX: number;
  posY: number;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "planning" | "in_progress" | "debugging" | "completed" | "failed";
  progress: number;
  logs?: string[];
}

export interface WorldEvent {
  id: string;
  timestamp: string;
  severity: "info" | "warning" | "critical" | "success";
  message: string;
}

export interface WorldState {
  agents: Agent[];
  tasks: Task[];
  worldTime: string;
}

interface ColonyStats {
  completedTasks: number;
  activeAgents: number;
  colonyHealth: number;
  averageEnergy: number;
  avgEnergy: number;
}

type QueryOptions = {
  query?: Record<string, unknown>;
};

type CreateTaskInput = {
  data: {
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "critical";
  };
};

const nowIso = () => new Date().toISOString();

const agents: Agent[] = [
  { id: "a1", name: "ARIA", role: "researcher", state: "researching", mood: "focused", energy: 82, stress: 24, personality: "Analytical and methodical.", roomId: "research", posX: 13, posY: 3, color: "#5fa8ff" },
  { id: "a2", name: "BOLT", role: "developer", state: "coding", mood: "confident", energy: 76, stress: 30, personality: "Fast, practical, and direct.", roomId: "developer", posX: 23, posY: 4, color: "#56c271" },
  { id: "a3", name: "SAGE", role: "planner", state: "planning", mood: "calm", energy: 88, stress: 18, personality: "Organized and strategic.", roomId: "command", posX: 4, posY: 3, color: "#b085f5" },
  { id: "a4", name: "GLITCH", role: "debugger", state: "debugging", mood: "alert", energy: 69, stress: 36, personality: "Persistent and detail-oriented.", roomId: "debug", posX: 4, posY: 11, color: "#ff8b5c" },
  { id: "a5", name: "NEXUS", role: "deployer", state: "deploying", mood: "focused", energy: 73, stress: 32, personality: "Reliable and steady.", roomId: "deploy", posX: 13, posY: 11, color: "#f7be5f" },
  { id: "a6", name: "VAULT", role: "ops", state: "idle", mood: "neutral", energy: 64, stress: 28, personality: "Careful and resilient.", roomId: "server", posX: 24, posY: 11, color: "#7f8da4" },
  { id: "a7", name: "PRISM", role: "qa", state: "walking", mood: "curious", energy: 79, stress: 22, personality: "Curious and observant.", roomId: "monitoring", posX: 24, posY: 19, color: "#e46ea1" },
  { id: "a8", name: "ECHO", role: "support", state: "sleeping", mood: "resting", energy: 92, stress: 12, personality: "Empathetic and patient.", roomId: "energy", posX: 33, posY: 11, color: "#56d0c2" },
];

let tasks: Task[] = [
  {
    id: "t1",
    title: "Initialize frontend scene",
    description: "Load Phaser world and HUD overlays.",
    priority: "high",
    status: "in_progress",
    progress: 64,
    logs: ["✓ Scene mounted", "✓ Agents seeded", "Running render updates..."],
  },
  {
    id: "t2",
    title: "Monitor colony telemetry",
    description: "Track health, events, and active agent count.",
    priority: "medium",
    status: "planning",
    progress: 18,
    logs: ["Planning data sync strategy..."],
  },
];

let events: WorldEvent[] = [
  { id: "e1", timestamp: nowIso(), severity: "info", message: "Standalone frontend mode initialized." },
  { id: "e2", timestamp: nowIso(), severity: "success", message: "Phaser world loaded successfully." },
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function getWorldState(): WorldState {
  return {
    agents: clone(agents),
    tasks: clone(tasks),
    worldTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

function getColonyStats(): ColonyStats {
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const activeAgents = agents.filter((agent) => agent.state !== "sleeping" && agent.state !== "idle").length;
  const averageEnergy = agents.length ? agents.reduce((sum, agent) => sum + agent.energy, 0) / agents.length : 0;
  const colonyHealth = Math.max(0, Math.min(100, Math.round(averageEnergy)));

  return {
    completedTasks,
    activeAgents,
    colonyHealth,
    averageEnergy,
    avgEnergy: averageEnergy,
  };
}

export function getGetAgentQueryKey(agentId: string) {
  return ["agent", agentId] as const;
}

export function useGetWorldState(options?: QueryOptions) {
  return useQuery<WorldState>({
    queryKey: ["world-state"],
    queryFn: async () => getWorldState(),
    ...(options?.query ?? {}),
  });
}

export function useListTasks(_params?: unknown, options?: QueryOptions) {
  return useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: async () => clone(tasks),
    ...(options?.query ?? {}),
  });
}

export function useListEvents(params?: { limit?: number }, options?: QueryOptions) {
  return useQuery<WorldEvent[]>({
    queryKey: ["events", params?.limit ?? null],
    queryFn: async () => {
      const source = clone(events);
      if (!params?.limit) return source;
      return source.slice(-params.limit);
    },
    ...(options?.query ?? {}),
  });
}

export function useGetAgent(agentId: string, options?: QueryOptions) {
  return useQuery<Agent | undefined>({
    queryKey: getGetAgentQueryKey(agentId),
    queryFn: async () => clone(agents.find((agent) => agent.id === agentId)),
    enabled: Boolean(agentId),
    ...(options?.query ?? {}),
  });
}

export function useGetColonyStats(options?: QueryOptions) {
  return useQuery<ColonyStats>({
    queryKey: ["colony-stats"],
    queryFn: async () => getColonyStats(),
    ...(options?.query ?? {}),
  });
}

export function useHealthCheck(options?: QueryOptions) {
  return useQuery<{ status: "ok" }>({
    queryKey: ["health-check"],
    queryFn: async () => ({ status: "ok" }),
    ...(options?.query ?? {}),
  });
}

export function useCreateTask(options?: { mutation?: { onSuccess?: (task: Task) => void } }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const newTask: Task = {
        id: `t-${Date.now()}`,
        title: input.data.title,
        description: input.data.description,
        priority: input.data.priority,
        status: "pending",
        progress: 0,
        logs: ["Task queued in standalone frontend mode."],
      };

      tasks = [...tasks, newTask];
      events = [
        ...events,
        {
          id: `e-${Date.now()}`,
          timestamp: nowIso(),
          severity: "info",
          message: `Task created: ${newTask.title}`,
        },
      ].slice(-150);

      return clone(newTask);
    },
    onSuccess: (task) => {
      queryClient.setQueryData(["tasks"], clone(tasks));
      queryClient.setQueryData(["events", null], clone(events));
      queryClient.setQueryData(["world-state"], getWorldState());
      queryClient.setQueryData(["colony-stats"], getColonyStats());
      options?.mutation?.onSuccess?.(task);
    },
  });
}
