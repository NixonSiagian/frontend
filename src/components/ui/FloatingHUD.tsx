import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useGetColonyStats,
  useListTasks,
  useListEvents,
  useGetAgent,
  getGetAgentQueryKey,
  useCreateTask,
} from "@/lib/api-client-react";
import { useColonyStore } from "@/store/colony";

const MINIMAP_W = 160;
const MINIMAP_H = 104;
const WORLD_W = 40;
const WORLD_H = 26;
const MX = MINIMAP_W / WORLD_W;
const MY = MINIMAP_H / WORLD_H;

const MINIMAP_ROOMS = [
  { id: 'command',    x: 1,  y: 1,  w: 8, h: 6, fill: '#f2e8d4' },
  { id: 'research',   x: 11, y: 1,  w: 8, h: 6, fill: '#d4e4f4' },
  { id: 'developer',  x: 21, y: 1,  w: 8, h: 6, fill: '#d4f0d8' },
  { id: 'debug',      x: 1,  y: 9,  w: 8, h: 6, fill: '#f4d8d8' },
  { id: 'deploy',     x: 11, y: 9,  w: 8, h: 6, fill: '#d8f4e8' },
  { id: 'server',     x: 21, y: 9,  w: 8, h: 6, fill: '#c8d4e4' },
  { id: 'memory',     x: 1,  y: 17, w: 8, h: 6, fill: '#e4d8f4' },
  { id: 'meeting',    x: 11, y: 17, w: 8, h: 6, fill: '#f4e8d4' },
  { id: 'monitoring', x: 21, y: 17, w: 8, h: 6, fill: '#d4e0f4' },
  { id: 'energy',     x: 31, y: 9,  w: 6, h: 6, fill: '#f2f4d4' },
];

const STATUS_COLORS: Record<string, string> = {
  pending:     '#9ca3af',
  planning:    '#60a5fa',
  in_progress: '#f59e0b',
  debugging:   '#f97316',
  completed:   '#22c55e',
  failed:      '#ef4444',
};

const AGENT_STATE_COLORS: Record<string, string> = {
  idle:       '#9ca3af',
  walking:    '#60a5fa',
  coding:     '#4ade80',
  researching:'#f472b6',
  debugging:  '#fb923c',
  deploying:  '#facc15',
  sleeping:   '#6366f1',
  discussing: '#a78bfa',
  planning:   '#38bdf8',
  fixing:     '#fb7185',
  publishing: '#f43f5e',
  seo:        '#2dd4bf',
  browsing:   '#818cf8',
};

const EVENT_COLORS: Record<string, string> = {
  info:    '#3b82f6',
  warning: '#f59e0b',
  critical:'#ef4444',
  success: '#22c55e',
};

const FILE_ICONS: Record<string, string> = {
  html: '🌐', css: '🎨', js: '⚡', ts: '🔷', json: '📋',
  md: '📝', txt: '📄', py: '🐍', sh: '💻', png: '📸', jpg: '🖼️', default: '📁',
};
const STANDALONE_FILE_PREVIEW_MESSAGE = 'preview is unavailable in standalone frontend mode.';

function fileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || FILE_ICONS.default;
}

const taskSchema = z.object({
  title: z.string().min(1, "Title required"),
  description: z.string().min(1, "Description required"),
  priority: z.enum(["low", "medium", "high", "critical"]),
});
type TaskFormData = z.infer<typeof taskSchema>;

function Minimap() {
  const agents = useColonyStore(s => s.agents);
  return (
    <svg
      width={MINIMAP_W}
      height={MINIMAP_H}
      style={{ display: 'block', borderRadius: 6, border: '1px solid #c8b08060' }}
    >
      <rect width={MINIMAP_W} height={MINIMAP_H} fill="#b8a888" rx={6} />
      {MINIMAP_ROOMS.map(r => (
        <rect
          key={r.id}
          x={r.x * MX} y={r.y * MY}
          width={r.w * MX} height={r.h * MY}
          fill={r.fill} stroke="#3d2810" strokeWidth={0.8}
        />
      ))}
      {agents.map(a => (
        <circle
          key={a.id}
          cx={a.posX * MX + MX / 2}
          cy={a.posY * MY + MY / 2}
          r={2.5}
          fill={a.color || '#ff6600'}
          stroke="#ffffff"
          strokeWidth={0.6}
        />
      ))}
    </svg>
  );
}

// ─── TASK EXECUTION PANEL ───────────────────────────────────────────────────

interface TaskPanelProps {
  taskId: string;
  onClose: () => void;
}

function TaskExecutionPanel({ taskId, onClose }: TaskPanelProps) {
  const storeTasks = useColonyStore(s => s.tasks);
  const workspaceFiles = useColonyStore(s => s.workspaceFiles[taskId] || []);
  const taskLogs = useColonyStore(s => s.taskLogs[taskId] || []);
  const [activeTab, setActiveTab] = useState<'logs' | 'files' | 'view'>('logs');
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loadingFile, setLoadingFile] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const task = storeTasks.find(t => t.id === taskId);

  useEffect(() => {
    if (activeTab === 'logs' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [taskLogs, activeTab]);

  async function viewFile(filename: string) {
    setViewingFile(filename);
    setLoadingFile(true);
    setActiveTab('view');
    setFileContent(`// "${filename}" ${STANDALONE_FILE_PREVIEW_MESSAGE}`);
    setLoadingFile(false);
  }

  function openPreview(filename = 'index.html') {
    const previewHtml = `<!doctype html><html><body style="font-family: monospace; padding: 24px;"><h2>Preview unavailable</h2><p>File <strong>${filename}</strong> cannot be rendered because this build runs as a standalone frontend without backend workspace APIs.</p></body></html>`;
    const blob = new Blob([previewHtml], { type: 'text/html' });
    const previewUrl = URL.createObjectURL(blob);
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(previewUrl), 5000);
  }

  function getPreviewFile(): string | null {
    const htmlFiles = workspaceFiles.filter(f => f.endsWith('.html'));
    if (!htmlFiles.length) return null;
    return htmlFiles.find(f => f === 'publish.html') || htmlFiles.find(f => f === 'index.html') || htmlFiles[0];
  }

  const statusColor = STATUS_COLORS[task?.status || 'pending'] || '#9ca3af';
  const progress = task?.progress ?? 0;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 64,
        left: 12,
        width: 420,
        maxHeight: 480,
        background: 'rgba(250,246,239,0.98)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(93,61,30,0.2)',
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 25,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: '1px solid rgba(93,61,30,0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: statusColor, flexShrink: 0,
          boxShadow: `0 0 5px ${statusColor}80`,
        }} />
        <span style={{ fontWeight: 700, fontSize: 12, color: '#3d2810', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task?.title || 'Task'}
        </span>
        <span style={{ fontSize: 10, color: statusColor, fontWeight: 700, textTransform: 'uppercase' }}>
          {task?.status?.replace('_', ' ') || 'pending'}
        </span>
        {getPreviewFile() && (
          <button
            onClick={() => openPreview(getPreviewFile()!)}
            title="Open live preview"
            style={{
              background: '#238636', color: '#fff', border: 'none', borderRadius: 5,
              padding: '2px 8px', fontSize: 10, fontFamily: 'monospace', cursor: 'pointer',
              fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
            }}
          >
            🌍 Preview
          </button>
        )}
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9b7a58', lineHeight: 1, marginLeft: 4 }}
        >
          ×
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: '#e8dcc8', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: statusColor, transition: 'width 0.8s ease' }} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(93,61,30,0.1)', flexShrink: 0 }}>
        {(['logs', 'files', ...(viewingFile ? ['view'] : [])] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              flex: 1,
              padding: '7px 8px',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'monospace',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === tab ? '#fff' : 'transparent',
              color: activeTab === tab ? '#3d2810' : '#9b7a58',
              borderBottom: activeTab === tab ? '2px solid #5c3d1e' : '2px solid transparent',
            }}
          >
            {tab === 'logs' ? `Logs (${taskLogs.length})` : tab === 'files' ? `Files (${workspaceFiles.length})` : `View: ${viewingFile?.split('/').pop()}`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>

        {/* Logs tab */}
        {activeTab === 'logs' && (
          <div style={{ padding: '6px 0', fontSize: 10, color: '#4a2e10' }}>
            {taskLogs.length === 0 ? (
              <div style={{ padding: '12px 14px', color: '#9b7a58', fontStyle: 'italic' }}>
                Waiting for agents to start...
              </div>
            ) : (
              taskLogs.map((line, i) => {
                const isFile      = line.includes('[FILE]') || line.includes('filesystem.');
                const isBrowser   = line.includes('browser.') || line.includes('🌐') || line.includes('🔍');
                const isTerminal  = line.includes('terminal.') || line.includes('💻');
                const isError     = (line.includes('✗') || line.toLowerCase().includes('error')) && !line.includes('✓');
                const isSuccess   = line.includes('✓') || line.toLowerCase().includes('complete') || line.toLowerCase().includes('success') || line.toLowerCase().includes('published');
                const isPreview   = line.toLowerCase().includes('preview url') || line.toLowerCase().includes('preview:') || line.toLowerCase().includes('published!');
                const color = isPreview ? '#38bdf8' : isError ? '#ef4444' : isSuccess ? '#22c55e' : isBrowser ? '#818cf8' : isTerminal ? '#f59e0b' : isFile ? '#34d399' : '#4a2e10';
                const bg = isPreview ? 'rgba(56,189,248,0.08)' : isTerminal ? 'rgba(245,158,11,0.05)' : isBrowser ? 'rgba(129,140,248,0.05)' : 'transparent';
                return (
                  <div
                    key={i}
                    style={{
                      padding: '2px 14px',
                      borderBottom: '1px solid rgba(0,0,0,0.025)',
                      color,
                      background: bg,
                      lineHeight: 1.6,
                      fontFamily: (isTerminal || isBrowser || isFile) ? 'monospace' : undefined,
                    }}
                  >
                    {line}
                  </div>
                );
              })
            )}
            <div ref={logsEndRef} />
          </div>
        )}

        {/* Files tab */}
        {activeTab === 'files' && (
          <div style={{ padding: '6px 0' }}>
            {workspaceFiles.length === 0 ? (
              <div style={{ padding: '12px 14px', color: '#9b7a58', fontSize: 10, fontStyle: 'italic' }}>
                No files created yet. Agents are working...
              </div>
            ) : (
              workspaceFiles.map((filename, i) => (
                <button
                  key={i}
                  onClick={() => viewFile(filename)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '6px 14px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(93,61,30,0.06)',
                    textAlign: 'left',
                    fontFamily: 'monospace',
                  }}
                >
                  <span style={{ fontSize: 14 }}>{fileIcon(filename)}</span>
                  <span style={{ fontSize: 11, color: '#3d2810', flex: 1 }}>{filename}</span>
                  <span style={{ fontSize: 9, color: '#9b7a58' }}>view →</span>
                </button>
              ))
            )}
          </div>
        )}

        {/* File view tab */}
        {activeTab === 'view' && (
          <div style={{ padding: 0, height: '100%' }}>
            {loadingFile ? (
              <div style={{ padding: '12px 14px', color: '#9b7a58', fontSize: 10 }}>Loading...</div>
            ) : (
              <pre style={{
                margin: 0,
                padding: '10px 14px',
                fontSize: 10,
                color: '#2d1a08',
                background: '#fdfaf4',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                lineHeight: 1.6,
                height: '100%',
              }}>
                {fileContent}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN HUD ───────────────────────────────────────────────────────────────

function useClock() {
  const fmt = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const [clock, setClock] = useState(fmt);
  useEffect(() => {
    const iv = setInterval(() => setClock(fmt()), 1000);
    return () => clearInterval(iv);
  }, []);
  const h = new Date().getHours();
  const isDawn  = h >= 5  && h < 8;
  const isDay   = h >= 8  && h < 18;
  const isDusk  = h >= 18 && h < 21;
  const isNight = h >= 21 || h < 5;
  const icon = isNight ? '🌙' : isDusk ? '🌆' : isDawn ? '🌅' : '☀️';
  return { clock, icon, isNight };
}

export function FloatingHUD() {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [activePanelTaskId, setActivePanelTaskId] = useState<string | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const { clock, icon, isNight } = useClock();

  // Individual selectors — each one only re-renders when its specific slice changes
  const agents = useColonyStore(s => s.agents);
  const storeTasks = useColonyStore(s => s.tasks);
  const events = useColonyStore(s => s.events);
  const selectedAgentId = useColonyStore(s => s.selectedAgentId);
  const setSelectedAgent = useColonyStore(s => s.setSelectedAgent);

  // Stats — lightweight, poll every 10s
  const { data: stats } = useGetColonyStats({ query: { refetchInterval: 10000, staleTime: 8000 } });

  // Tasks — one-time load for log seeding; socket handles live updates
  const { data: serverTasks } = useListTasks(undefined, {
    query: { refetchOnWindowFocus: false, staleTime: Infinity },
  });

  // Events — one-time load; socket handles live updates
  const { data: serverEvents } = useListEvents(undefined, {
    query: { refetchOnWindowFocus: false, staleTime: Infinity },
  });

  // Stable query key — only recomputed when selectedAgentId changes
  const agentKey = useMemo(
    () => getGetAgentQueryKey(selectedAgentId ?? ''),
    [selectedAgentId]
  );
  const { data: selectedAgent } = useGetAgent(selectedAgentId ?? '', {
    query: { enabled: !!selectedAgentId, queryKey: agentKey, staleTime: 15000 },
  });

  // Seed task list + logs ONCE on initial load — socket handles updates after this
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !serverTasks) return;
    seededRef.current = true;
    const store = useColonyStore.getState();
    store.setTasks(serverTasks);
    for (const t of serverTasks) {
      if (Array.isArray((t as any).logs) && (t as any).logs.length > 0) {
        store.setTaskLogs(t.id, (t as any).logs as string[]);
      }
    }
  }, [serverTasks]);

  // Seed events ONCE — socket delivers new events in real-time
  const eventSeededRef = useRef(false);
  useEffect(() => {
    if (eventSeededRef.current || !serverEvents?.length) return;
    eventSeededRef.current = true;
    const store = useColonyStore.getState();
    serverEvents.forEach(e => store.addEvent(e));
  }, [serverEvents]);

  // Auto-open panel for the first active task — use ref to avoid activePanelTaskId in deps
  const activePanelTaskIdRef = useRef<string | null>(null);
  activePanelTaskIdRef.current = activePanelTaskId;
  useEffect(() => {
    if (activePanelTaskIdRef.current) return;
    const active = storeTasks.find(t => t.status === 'in_progress' || t.status === 'planning');
    if (active) setActivePanelTaskId(active.id);
  }, [storeTasks]); // only re-runs when storeTasks changes, not when panel state changes

  // Scroll event log to bottom — throttle via ref so we don't scroll on every render
  const scrollScheduledRef = useRef(false);
  useEffect(() => {
    if (!showEvents || scrollScheduledRef.current) return;
    scrollScheduledRef.current = true;
    requestAnimationFrame(() => {
      eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      scrollScheduledRef.current = false;
    });
  }, [events, showEvents]);

  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: { priority: 'medium' },
  });
  const priority = watch('priority');

  const { mutate: createTask, isPending } = useCreateTask({
    mutation: {
      onSuccess: (newTask) => {
        reset();
        setShowTaskModal(false);
        setActivePanelTaskId(newTask.id);
      },
    },
  });

  const onSubmit = (data: TaskFormData) => {
    createTask({ data });
  };

  const activeCount = useMemo(
    () => agents.filter(a => a.state !== 'sleeping' && a.state !== 'idle').length,
    [agents]
  );
  const health = stats?.colonyHealth ?? 100;
  const healthColor = health > 80 ? '#22c55e' : health > 50 ? '#eab308' : '#ef4444';
  const avgEnergy = stats?.averageEnergy ?? 0;

  // Events come from the store (seeded once + pushed via socket)
  const allEvents = useMemo(
    () => [...events].slice(-100),
    [events]
  );
  const recentTasks = useMemo(
    () => [...storeTasks].reverse().slice(0, 10),
    [storeTasks]
  );
  const activeTasks = useMemo(
    () => storeTasks.filter(t => t.status === 'in_progress' || t.status === 'planning'),
    [storeTasks]
  );

  return (
    <>
      {/* Top-left: Colony status chip */}
      <div
        className="fixed top-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
        style={{
          background: isNight ? 'rgba(15,20,40,0.88)' : 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(8px)',
          border: `1px solid ${isNight ? 'rgba(100,120,200,0.3)' : 'rgba(93,61,30,0.2)'}`,
          color: isNight ? '#c8d8f8' : '#3d2810',
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          fontFamily: 'monospace',
          transition: 'background 1.5s ease, color 1.5s ease',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: healthColor, display: 'inline-block', boxShadow: `0 0 4px ${healthColor}` }} />
        <span style={{ fontWeight: 700 }}>AI Colony OS</span>
        <span style={{ opacity: 0.4 }}>|</span>
        <span>{activeCount}/{agents.length || 8} working</span>
        {activeTasks.length > 0 && (
          <>
            <span style={{ opacity: 0.4 }}>|</span>
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>{activeTasks.length} task{activeTasks.length !== 1 ? 's' : ''} running</span>
          </>
        )}
        <span style={{ opacity: 0.4 }}>|</span>
        <span style={{ fontWeight: 600 }}>{icon} {clock}</span>
      </div>

      {/* Top-right: minimap */}
      <div className="fixed top-3 right-3 z-20 flex flex-col items-end gap-2">
        <button
          onClick={() => setShowMinimap(v => !v)}
          style={{
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(93,61,30,0.2)',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 11,
            fontFamily: 'monospace',
            color: '#3d2810',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}
        >
          {showMinimap ? 'Hide Map' : 'Map'}
        </button>
        {showMinimap && (
          <div style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.18)', borderRadius: 8 }}>
            <Minimap />
          </div>
        )}
      </div>

      {/* Active tasks quick-access pills (below minimap) */}
      {activeTasks.length > 0 && (
        <div className="fixed right-3 z-20 flex flex-col gap-1" style={{ top: showMinimap ? 148 : 52 }}>
          {activeTasks.slice(0, 3).map(t => (
            <button
              key={t.id}
              onClick={() => setActivePanelTaskId(activePanelTaskId === t.id ? null : t.id)}
              style={{
                background: activePanelTaskId === t.id ? '#5c3d1e' : 'rgba(255,255,255,0.9)',
                color: activePanelTaskId === t.id ? '#f5edd8' : '#3d2810',
                border: `1px solid ${activePanelTaskId === t.id ? '#5c3d1e' : 'rgba(93,61,30,0.2)'}`,
                borderRadius: 8,
                padding: '5px 10px',
                fontSize: 10,
                fontFamily: 'monospace',
                cursor: 'pointer',
                maxWidth: 160,
                textAlign: 'left',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[t.status] || '#9ca3af', flexShrink: 0, animation: t.status === 'in_progress' ? 'pulse 1.5s infinite' : 'none' }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                  {t.title}
                </span>
              </div>
              <div style={{ fontSize: 9, marginTop: 2, opacity: 0.7 }}>
                {Math.round(t.progress ?? 0)}% — {t.status.replace('_', ' ')}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Task execution panel */}
      {activePanelTaskId && (
        <TaskExecutionPanel
          taskId={activePanelTaskId}
          onClose={() => setActivePanelTaskId(null)}
        />
      )}

      {/* Selected agent card */}
      {selectedAgentId && (
        <div
          className="fixed z-20 rounded-xl"
          style={{
            bottom: activePanelTaskId ? 560 : 72,
            right: 12,
            width: 220,
            background: 'rgba(255,255,255,0.94)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(93,61,30,0.2)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            fontFamily: 'monospace',
            color: '#3d2810',
          }}
        >
          <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid rgba(93,61,30,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 12, height: 12, borderRadius: '50%',
                background: selectedAgent?.color || agents.find(a => a.id === selectedAgentId)?.color || '#ff6600',
                display: 'inline-block',
                border: '1.5px solid rgba(0,0,0,0.15)',
              }} />
              <span style={{ fontWeight: 700, fontSize: 13 }}>
                {selectedAgent?.name || agents.find(a => a.id === selectedAgentId)?.name || '...'}
              </span>
            </div>
            <button onClick={() => setSelectedAgent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#9b7a58', lineHeight: 1 }}>×</button>
          </div>

          <div style={{ padding: '10px 12px', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedAgent?.role && <div style={{ color: '#7a5230', fontSize: 10 }}>{selectedAgent.role.toUpperCase()}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#9b7a58', minWidth: 40 }}>State</span>
              {(() => {
                const state = selectedAgent?.state || agents.find(a => a.id === selectedAgentId)?.state || 'idle';
                const stateColor = AGENT_STATE_COLORS[state] || '#9ca3af';
                const stateEmoji: Record<string,string> = { idle:'😴', walking:'🚶', coding:'💻', researching:'🔬', debugging:'🐛', deploying:'🚀', sleeping:'💤', discussing:'💬', planning:'📋', fixing:'🔧', publishing:'📡', seo:'🔎', browsing:'🌐' };
                return (
                  <span style={{ background: `${stateColor}22`, borderRadius: 4, padding: '1px 8px', fontSize: 10, fontWeight: 700, textTransform: 'capitalize', color: stateColor, border: `1px solid ${stateColor}44` }}>
                    {stateEmoji[state] || '🤖'} {state}
                  </span>
                );
              })()}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#7a5230' }}>
                <span>Energy</span>
                <span>{Math.round(selectedAgent?.energy ?? agents.find(a => a.id === selectedAgentId)?.energy ?? 0)}%</span>
              </div>
              <div style={{ height: 5, background: '#e8dcc8', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${selectedAgent?.energy ?? agents.find(a => a.id === selectedAgentId)?.energy ?? 0}%`,
                  background: '#22c55e',
                  borderRadius: 3,
                  transition: 'width 0.5s',
                }} />
              </div>
            </div>

            {selectedAgent?.personality && (
              <div style={{ fontSize: 9, color: '#9b7a58', fontStyle: 'italic', lineHeight: 1.4 }}>
                {selectedAgent.personality}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event log slide-up panel */}
      {showEvents && (
        <div
          className="fixed left-3 right-3 z-20 rounded-t-xl"
          style={{
            bottom: 60,
            maxHeight: 220,
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(93,61,30,0.2)',
            borderBottom: 'none',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
            fontFamily: 'monospace',
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: '8px 12px 4px', borderBottom: '1px solid rgba(93,61,30,0.1)', fontSize: 10, fontWeight: 700, color: '#5c3d1e', letterSpacing: '0.05em' }}>
            WORLD EVENTS
          </div>
          <div style={{ padding: '4px 0', fontSize: 10, color: '#4a2e10' }}>
            {allEvents.length === 0 && <div style={{ padding: '8px 12px', color: '#9b7a58' }}>No events yet...</div>}
            {allEvents.map((ev, i) => {
              const ts = ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
              const sev = (ev as any).severity || 'info';
              return (
                <div key={ev.id || i} style={{ padding: '3px 12px', borderBottom: '1px solid rgba(0,0,0,0.03)', display: 'flex', gap: 8 }}>
                  <span style={{ color: '#9b7a58', minWidth: 64, flexShrink: 0 }}>{ts}</span>
                  <span style={{ color: EVENT_COLORS[sev] || '#4a2e10', fontSize: 9, fontWeight: 700, minWidth: 52, flexShrink: 0 }}>[{sev.toUpperCase()}]</span>
                  <span>{ev.message}</span>
                </div>
              );
            })}
            <div ref={eventsEndRef} />
          </div>
        </div>
      )}

      {/* Bottom toolbar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between px-4"
        style={{
          height: 56,
          background: 'rgba(255,255,255,0.90)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(93,61,30,0.15)',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.1)',
          fontFamily: 'monospace',
        }}
      >
        {/* Left: New Task button */}
        <button
          onClick={() => setShowTaskModal(true)}
          style={{
            background: '#5c3d1e',
            color: '#f5edd8',
            border: 'none',
            borderRadius: 8,
            padding: '7px 16px',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'monospace',
            cursor: 'pointer',
            letterSpacing: '0.03em',
          }}
        >
          + Assign Task
        </button>

        {/* Center: stats chips */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 11, color: '#5c3d1e' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#3d2810' }}>{activeCount}</span>
            <span style={{ color: '#9b7a58', fontSize: 9 }}>WORKING</span>
          </div>
          <div style={{ width: 1, height: 24, background: 'rgba(93,61,30,0.2)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: healthColor }}>{health}%</span>
            <span style={{ color: '#9b7a58', fontSize: 9 }}>HEALTH</span>
          </div>
          <div style={{ width: 1, height: 24, background: 'rgba(93,61,30,0.2)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#3d2810' }}>{stats?.completedTasks ?? 0}</span>
            <span style={{ color: '#9b7a58', fontSize: 9 }}>DONE</span>
          </div>
          <div style={{ width: 1, height: 24, background: 'rgba(93,61,30,0.2)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#3d2810' }}>{Math.round(avgEnergy)}%</span>
            <span style={{ color: '#9b7a58', fontSize: 9 }}>ENERGY</span>
          </div>
        </div>

        {/* Right: Events toggle */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowEvents(v => !v)}
            style={{
              background: showEvents ? '#5c3d1e' : 'rgba(93,61,30,0.1)',
              color: showEvents ? '#f5edd8' : '#5c3d1e',
              border: '1px solid rgba(93,61,30,0.2)',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'monospace',
              cursor: 'pointer',
            }}
          >
            Events {showEvents ? '▼' : '▲'}
          </button>
          <button
            onClick={() => setShowTaskModal(true)}
            style={{
              background: 'rgba(93,61,30,0.1)',
              color: '#5c3d1e',
              border: '1px solid rgba(93,61,30,0.2)',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'monospace',
              cursor: 'pointer',
            }}
          >
            Tasks ({recentTasks.length})
          </button>
        </div>
      </div>

      {/* Task assignment modal */}
      {showTaskModal && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowTaskModal(false); }}
        >
          <div
            style={{
              background: '#faf6ef',
              border: '1px solid rgba(93,61,30,0.25)',
              borderRadius: 16,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              width: 520,
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: 'calc(100vh - 60px)',
              fontFamily: 'monospace',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal header */}
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(93,61,30,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#3d2810', letterSpacing: '0.04em' }}>ASSIGN TASK TO COLONY</div>
                <div style={{ fontSize: 10, color: '#9b7a58', marginTop: 2 }}>Agents will execute this using real AI — generating actual files and code</div>
              </div>
              <button onClick={() => setShowTaskModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, color: '#9b7a58', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#7a5230', letterSpacing: '0.06em' }}>TASK TITLE</label>
                  <input
                    {...register('title')}
                    placeholder="e.g. Build a portfolio website"
                    style={{
                      background: '#fff',
                      border: `1px solid ${errors.title ? '#ef4444' : 'rgba(93,61,30,0.2)'}`,
                      borderRadius: 8,
                      padding: '9px 12px',
                      fontSize: 12,
                      fontFamily: 'monospace',
                      color: '#3d2810',
                      outline: 'none',
                    }}
                  />
                  {errors.title && <span style={{ fontSize: 10, color: '#ef4444' }}>{errors.title.message}</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#7a5230', letterSpacing: '0.06em' }}>DESCRIPTION</label>
                  <textarea
                    {...register('description')}
                    placeholder="Describe the project in detail. The Research agent will analyze requirements, Developer agent will write real code, Debugger will review it, and Deploy agent will package the result."
                    rows={4}
                    style={{
                      background: '#fff',
                      border: `1px solid ${errors.description ? '#ef4444' : 'rgba(93,61,30,0.2)'}`,
                      borderRadius: 8,
                      padding: '9px 12px',
                      fontSize: 12,
                      fontFamily: 'monospace',
                      color: '#3d2810',
                      outline: 'none',
                      resize: 'vertical',
                      minHeight: 88,
                    }}
                  />
                  {errors.description && <span style={{ fontSize: 10, color: '#ef4444' }}>{errors.description.message}</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#7a5230', letterSpacing: '0.06em' }}>PRIORITY</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['low', 'medium', 'high', 'critical'] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setValue('priority', p)}
                        style={{
                          flex: 1,
                          padding: '7px 4px',
                          borderRadius: 7,
                          fontSize: 10,
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          cursor: 'pointer',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          border: '1.5px solid',
                          borderColor: priority === p
                            ? ({ low: '#22c55e', medium: '#3b82f6', high: '#f59e0b', critical: '#ef4444' }[p])
                            : 'rgba(93,61,30,0.15)',
                          background: priority === p
                            ? ({ low: '#dcfce7', medium: '#dbeafe', high: '#fef3c7', critical: '#fee2e2' }[p])
                            : 'transparent',
                          color: priority === p
                            ? ({ low: '#166534', medium: '#1e40af', high: '#92400e', critical: '#991b1b' }[p])
                            : '#9b7a58',
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Example tasks */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#9b7a58', letterSpacing: '0.06em' }}>QUICK EXAMPLES</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      { title: 'Portfolio website', description: 'Build a modern personal portfolio website with HTML, CSS, and JavaScript. Include sections for about, projects, skills, and contact.' },
                      { title: 'Todo app', description: 'Build a complete todo list application with add, delete, complete, and filter functionality. Use vanilla JavaScript.' },
                      { title: 'REST API design', description: 'Design and document a RESTful API for a blog platform with users, posts, and comments endpoints.' },
                      { title: 'Landing page', description: 'Create a product landing page with hero section, features grid, pricing table, and contact form.' },
                    ].map(ex => (
                      <button
                        key={ex.title}
                        type="button"
                        onClick={() => { setValue('title', ex.title); setValue('description', ex.description); }}
                        style={{
                          background: 'rgba(93,61,30,0.06)',
                          border: '1px solid rgba(93,61,30,0.15)',
                          borderRadius: 6,
                          padding: '4px 10px',
                          fontSize: 10,
                          fontFamily: 'monospace',
                          color: '#5c3d1e',
                          cursor: 'pointer',
                        }}
                      >
                        {ex.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent tasks */}
                {recentTasks.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#9b7a58', letterSpacing: '0.06em' }}>RECENT TASKS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 120, overflowY: 'auto' }}>
                      {recentTasks.slice(0, 6).map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => { setShowTaskModal(false); setActivePanelTaskId(t.id); }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '4px 8px',
                            background: 'rgba(93,61,30,0.04)',
                            border: '1px solid rgba(93,61,30,0.1)',
                            borderRadius: 5,
                            fontSize: 10,
                            fontFamily: 'monospace',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLORS[t.status] || '#9ca3af', flexShrink: 0 }} />
                          <span style={{ color: '#3d2810', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                          <span style={{ color: '#9b7a58', fontSize: 9, flexShrink: 0 }}>{t.status.replace('_', ' ')}</span>
                          <span style={{ color: '#b8a080', fontSize: 9, flexShrink: 0 }}>→ view</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  style={{
                    background: isPending ? '#9b7a58' : '#5c3d1e',
                    color: '#f5edd8',
                    border: 'none',
                    borderRadius: 10,
                    padding: '11px 20px',
                    fontSize: 12,
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.04em',
                  }}
                >
                  {isPending ? '⏳ Assigning to Colony...' : '🚀 Assign to Colony'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
