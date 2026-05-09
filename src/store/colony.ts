import { create } from 'zustand';
import { Agent, Task, WorldEvent, WorldState } from '@/lib/api-client-react';

export interface AgentTickUpdate {
  id: string;
  posX: number;
  posY: number;
  state: string;
  mood: string;
  energy: number;
  roomId: string;
}

interface ColonyStore {
  agents: Agent[];
  tasks: Task[];
  events: WorldEvent[];
  selectedAgentId: string | null;
  worldTime: string;
  workspaceFiles: Record<string, string[]>;
  taskLogs: Record<string, string[]>;
  setAgents: (agents: Agent[]) => void;
  updateAgentTick: (updates: AgentTickUpdate[], tickCount: number) => void;
  updateAgent: (agent: Agent) => void;
  addEvent: (event: WorldEvent) => void;
  setSelectedAgent: (id: string | null) => void;
  updateTask: (id: string, update: Partial<Task>) => void;
  setTasks: (tasks: Task[]) => void;
  setWorldState: (state: WorldState) => void;
  setWorldTime: (time: string) => void;
  addWorkspaceFile: (taskId: string, filename: string) => void;
  appendTaskLog: (taskId: string, line: string) => void;
  setTaskLogs: (taskId: string, lines: string[]) => void;
}

// Throttle agentTick updates — only apply if at least 200ms have passed
// This prevents rapid socket ticks from overwhelming React's update queue
let lastTickApplied = 0;

export const useColonyStore = create<ColonyStore>((set, get) => ({
  agents: [],
  tasks: [],
  events: [],
  selectedAgentId: null,
  worldTime: '00:00',
  workspaceFiles: {},
  taskLogs: {},

  setAgents: (agents) => set({ agents }),

  updateAgentTick: (updates, _tickCount) => {
    const now = Date.now();
    // Throttle: skip tick if last one was applied less than 200ms ago
    // The Phaser game reads directly from getState() at 60fps so it's unaffected
    if (now - lastTickApplied < 200) return;
    lastTickApplied = now;

    const currentAgents = get().agents;
    if (currentAgents.length === 0) return;

    const updatedAgents = currentAgents.slice(); // shallow copy
    let changed = false;
    for (const update of updates) {
      const index = updatedAgents.findIndex((a) => a.id === update.id);
      if (index !== -1) {
        const prev = updatedAgents[index];
        // Only update if something actually changed (avoid needless re-renders)
        if (
          prev.posX !== update.posX ||
          prev.posY !== update.posY ||
          prev.state !== update.state ||
          prev.energy !== update.energy
        ) {
          updatedAgents[index] = { ...prev, ...update } as Agent;
          changed = true;
        }
      }
    }
    if (changed) set({ agents: updatedAgents });
  },

  updateAgent: (agent) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.id === agent.id ? { ...a, ...agent } : a)),
    })),

  addEvent: (event) =>
    set((state) => ({ events: [...state.events, event].slice(-150) })),

  setSelectedAgent: (selectedAgentId) => set({ selectedAgentId }),

  updateTask: (id, update) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...update } : t)),
    })),

  setTasks: (tasks) => set({ tasks }),

  setWorldState: (worldState) =>
    set({ agents: worldState.agents, tasks: worldState.tasks, worldTime: worldState.worldTime }),

  setWorldTime: (worldTime) => set({ worldTime }),

  addWorkspaceFile: (taskId, filename) =>
    set((state) => {
      const existing = state.workspaceFiles[taskId] || [];
      if (existing.includes(filename)) return state;
      return {
        workspaceFiles: {
          ...state.workspaceFiles,
          [taskId]: [...existing, filename],
        },
      };
    }),

  appendTaskLog: (taskId, line) =>
    set((state) => {
      const existing = state.taskLogs[taskId] || [];
      return {
        taskLogs: {
          ...state.taskLogs,
          [taskId]: [...existing, line].slice(-300),
        },
      };
    }),

  setTaskLogs: (taskId, lines) =>
    set((state) => ({
      taskLogs: { ...state.taskLogs, [taskId]: lines },
    })),
}));
