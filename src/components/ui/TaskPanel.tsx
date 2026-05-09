import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateTask, useListTasks } from "@workspace/api-client-react";
import { useColonyStore } from "@/store/colony";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useEffect } from "react";

const taskSchema = z.object({
  title: z.string().min(1, "Required"),
  description: z.string().min(1, "Required"),
  priority: z.enum(["low", "medium", "high", "critical"]),
});

export function TaskPanel() {
  const storeTasks = useColonyStore((state) => state.tasks);
  const setTasks = useColonyStore((state) => state.setTasks);

  const { data: serverTasks } = useListTasks(undefined, {
    query: {
      refetchInterval: 10000,
    }
  });

  useEffect(() => {
    if (serverTasks) {
      setTasks(serverTasks);
    }
  }, [serverTasks, setTasks]);

  const createTask = useCreateTask({
    mutation: {
      onSuccess: () => {
        // Query will refetch or socket will update
        form.reset();
      }
    }
  });

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
    },
  });

  const onSubmit = (values: z.infer<typeof taskSchema>) => {
    createTask.mutate({ data: values });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-gray-500/20 text-gray-300 border-gray-500/50";
      case "planning": return "bg-blue-500/20 text-blue-300 border-blue-500/50";
      case "in_progress": return "bg-amber-500/20 text-amber-300 border-amber-500/50";
      case "debugging": return "bg-orange-500/20 text-orange-300 border-orange-500/50";
      case "completed": return "bg-green-500/20 text-green-300 border-green-500/50";
      case "failed": return "bg-red-500/20 text-red-300 border-red-500/50";
      default: return "bg-gray-500/20 text-gray-300 border-gray-500/50";
    }
  };

  return (
    <Card className="w-96 backdrop-blur-xl bg-card/80 border-primary/20 flex flex-col h-full max-h-[calc(100vh-120px)] shadow-[0_0_15px_rgba(0,212,255,0.1)]" data-testid="task-panel">
      <CardHeader className="pb-4 border-b border-primary/10 shrink-0">
        <CardTitle className="text-lg font-mono text-primary tracking-widest uppercase">
          TASK COMMAND
        </CardTitle>
      </CardHeader>
      
      <div className="p-4 border-b border-primary/10 shrink-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="TASK TITLE" {...field} className="bg-background/50 border-primary/20 focus-visible:ring-primary/50 font-mono text-sm h-8 uppercase placeholder:text-muted-foreground/50" data-testid="input-task-title" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea placeholder="TASK PARAMETERS..." {...field} className="bg-background/50 border-primary/20 focus-visible:ring-primary/50 font-mono text-sm resize-none h-16 uppercase placeholder:text-muted-foreground/50" data-testid="input-task-desc" />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-primary/20 h-8 font-mono text-xs uppercase" data-testid="select-task-priority">
                          <SelectValue placeholder="PRIORITY" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-primary/20">
                        <SelectItem value="low" className="font-mono text-xs uppercase">LOW</SelectItem>
                        <SelectItem value="medium" className="font-mono text-xs uppercase">MEDIUM</SelectItem>
                        <SelectItem value="high" className="font-mono text-xs uppercase">HIGH</SelectItem>
                        <SelectItem value="critical" className="font-mono text-xs uppercase">CRITICAL</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={createTask.isPending} className="h-8 font-mono text-xs tracking-widest bg-primary/20 text-primary hover:bg-primary/40 border border-primary/50" data-testid="button-submit-task">
                SUBMIT
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <ScrollArea className="flex-1 p-4" data-testid="task-list">
        <div className="space-y-3">
          {storeTasks.slice().reverse().map(task => (
            <div key={task.id} className="bg-background/40 border border-primary/10 rounded-md p-3 hover:border-primary/30 transition-colors" data-testid={`card-task-${task.id}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="font-mono text-sm font-bold text-foreground truncate pr-2 uppercase">
                  {task.title}
                </div>
                <Badge variant="outline" className={`font-mono text-[10px] px-1 py-0 h-4 uppercase ${getStatusColor(task.status)}`}>
                  {task.status}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground font-mono truncate mb-2 uppercase opacity-70">
                {task.description}
              </div>
              {task.status === "in_progress" && (
                <Progress value={task.progress} className="h-1 bg-primary/10 [&>div]:bg-primary" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
