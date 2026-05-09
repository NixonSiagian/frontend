import { useColonyStore } from "@/store/colony";
import { useGetAgent } from "@/lib/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AgentInspector() {
  const selectedAgentId = useColonyStore((state) => state.selectedAgentId);
  const setSelectedAgent = useColonyStore((state) => state.setSelectedAgent);

  const { data: agent } = useGetAgent(selectedAgentId || "", {
    query: {
      enabled: !!selectedAgentId,
      queryKey: ["/api/agents", selectedAgentId],
    },
  });

  if (!selectedAgentId) return null;

  return (
    <Card className="w-80 backdrop-blur-xl bg-card/80 border-primary/20" data-testid="agent-inspector">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-mono text-primary">
          AGENT DETAILS
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setSelectedAgent(null)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {agent ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: agent.color }}
              />
              <span className="font-bold text-lg">{agent.name}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">ROLE</span>
              <Badge variant="outline">{agent.role}</Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">STATE</span>
              <Badge className="bg-primary/20 text-primary">{agent.state}</Badge>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-green-400">Energy</span>
                <span>{agent.energy}%</span>
              </div>
              <Progress value={agent.energy} className="bg-muted h-2 [&>div]:bg-green-500" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-red-400">Stress</span>
                <span>{agent.stress}%</span>
              </div>
              <Progress value={agent.stress} className="bg-muted h-2 [&>div]:bg-red-500" />
            </div>

            <div className="space-y-1">
              <span className="text-sm text-muted-foreground block">PERSONALITY</span>
              <p className="text-xs italic">{agent.personality}</p>
            </div>

          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Loading...</div>
        )}
      </CardContent>
    </Card>
  );
}
