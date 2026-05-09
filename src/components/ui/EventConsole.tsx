import { useColonyStore } from "@/store/colony";
import { useListEvents } from "@workspace/api-client-react";
import { useEffect, useRef } from "react";

export function EventConsole() {
  const events = useColonyStore((state) => state.events);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load initial events once — empty dep array so listener never re-registers
  const { data: initialEvents } = useListEvents({ limit: 50 }, {
    query: { refetchOnWindowFocus: false, staleTime: Infinity },
  });

  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !initialEvents || initialEvents.length === 0) return;
    seededRef.current = true;
    const store = useColonyStore.getState();
    initialEvents.forEach(e => store.addEvent(e));
  }, [initialEvents]); // runs once when data first arrives

  // Scroll to bottom when new events arrive — use rAF to batch scroll calls
  const scrollPendingRef = useRef(false);
  useEffect(() => {
    if (scrollPendingRef.current) return;
    scrollPendingRef.current = true;
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
      scrollPendingRef.current = false;
    });
  }, [events]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "info":     return "text-cyan-400";
      case "warning":  return "text-yellow-400";
      case "critical": return "text-red-500";
      case "success":  return "text-green-400";
      default:         return "text-muted-foreground";
    }
  };

  return (
    <div
      className="pointer-events-auto backdrop-blur-md bg-card/80 border border-primary/20 rounded-lg p-3 flex flex-col h-48 shadow-[0_0_15px_rgba(0,212,255,0.1)]"
      data-testid="event-console"
    >
      <div className="text-xs font-bold text-primary/80 mb-2 uppercase tracking-widest border-b border-primary/20 pb-1">
        LIVE EVENT LOG
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto font-mono text-xs space-y-1 pr-2 custom-scrollbar">
        {events.map((event, i) => (
          <div
            key={event.id || i}
            className="flex items-start space-x-2 animate-in fade-in slide-in-from-left-2 duration-300"
          >
            <span className="text-muted-foreground shrink-0 opacity-50">
              [{new Date(event.timestamp).toLocaleTimeString()}]
            </span>
            <span className={`shrink-0 uppercase w-16 ${getSeverityColor(event.severity)}`}>
              [{event.severity}]
            </span>
            <span className="text-foreground break-words">{event.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
