'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { BarChart as BarChartIcon, BrainCircuit, ClipboardList, PlusCircle, Sparkles, Target, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useTasks } from '@/contexts/tasks-context';
import { handleAuditTaskAlignment } from '@/lib/actions';
import type { AuditTaskAlignmentOutput } from '@/ai/flows/audit-task-alignment';
import {
  buildActualTimeline,
  buildPlanTimeline,
  FOCUS_AUDITOR_COLORS,
  FOCUS_AUDITOR_LABELS,
  minuteToTimeLabel,
  parseActivityLogJson,
  timeLabelToMinute,
  validateActivityLogs,
  validateFocusPlanBlocks,
} from '@/lib/focus-auditor-engine';
import {
  loadFocusActivityLogs,
  loadFocusPlanBlocks,
  saveFocusActivityLogs,
  saveFocusAuditResult,
  saveFocusPlanBlocks,
} from '@/lib/focus-auditor-storage';
import { FocusClock } from '@/components/focus-auditor/focus-clock';
import type { FocusActivityLogEntry, FocusPlanBlock, FocusPlanType, FocusTimelineSegment } from '@/types/focus-auditor';
import { FOCUS_AUDITOR_PLAN_TYPES } from '@/types/focus-auditor';

function createEmptyBlock(): FocusPlanBlock {
  return {
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: '',
    type: 'focus',
    startMinute: 9 * 60,
    endMinute: 10 * 60,
  };
}

function TimelineStrip({ title, segments, emptyLabel }: { title: string; segments: FocusTimelineSegment[]; emptyLabel: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">00:00 to 24:00</span>
      </div>

      {segments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <>
          <div className="flex h-8 overflow-hidden rounded-full border border-border bg-muted/30">
            {segments.map((segment) => (
              <div
                key={`${title}-${segment.startMinute}-${segment.type}`}
                style={{
                  width: `${(segment.minutes / 1440) * 100}%`,
                  backgroundColor: FOCUS_AUDITOR_COLORS[segment.type],
                }}
                title={`${segment.label}: ${minuteToTimeLabel(segment.startMinute)}-${minuteToTimeLabel(segment.endMinute)}`}
              />
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {segments.slice(0, 8).map((segment) => (
              <div key={`${segment.type}-${segment.startMinute}`} className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: FOCUS_AUDITOR_COLORS[segment.type] }} />
                  <span>{segment.label}</span>
                </div>
                <span className="text-muted-foreground">
                  {minuteToTimeLabel(segment.startMinute)}-{minuteToTimeLabel(segment.endMinute)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function FocusAuditorWorkspace() {
  const { tasks } = useTasks();
  const [planBlocks, setPlanBlocks] = useState<FocusPlanBlock[]>([]);
  const [activityLogs, setActivityLogs] = useState<FocusActivityLogEntry[]>([]);
  const [activityJson, setActivityJson] = useState('');
  const [taskAuditResult, setTaskAuditResult] = useState<AuditTaskAlignmentOutput | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const storedPlan = loadFocusPlanBlocks();
    const storedLogs = loadFocusActivityLogs();
    const storedResult = localStorage.getItem('focusWeave.focusAuditor.taskResult');
 
    setPlanBlocks(storedPlan);
    setActivityLogs(storedLogs);
    setActivityJson(storedLogs.length > 0 ? JSON.stringify(storedLogs, null, 2) : '');
    
    if (storedResult) {
      try {
        setTaskAuditResult(JSON.parse(storedResult));
      } catch (e) {
        console.error("Failed to load task result");
      }
    }

    setIsLoaded(true);
  }, []);

  const planTimeline = buildPlanTimeline(planBlocks);
  const actualTimeline = buildActualTimeline(activityLogs);

  function updatePlanBlock(blockId: string, updates: Partial<FocusPlanBlock>) {
    setPlanBlocks((currentBlocks) => {
      const nextBlocks = currentBlocks.map((block) => (block.id === blockId ? { ...block, ...updates } : block));
      saveFocusPlanBlocks(nextBlocks);
      return nextBlocks;
    });
  }

  function addPlanBlock() {
    setPlanBlocks((currentBlocks) => {
      const nextBlocks = [...currentBlocks, createEmptyBlock()];
      saveFocusPlanBlocks(nextBlocks);
      return nextBlocks;
    });
  }

  function removePlanBlock(blockId: string) {
    setPlanBlocks((currentBlocks) => {
      const nextBlocks = currentBlocks.filter((block) => block.id !== blockId);
      saveFocusPlanBlocks(nextBlocks);
      return nextBlocks;
    });
  }
  function importLogs() {
    const parsed = parseActivityLogJson(activityJson);
    if (parsed.errors.length > 0) {
      setValidationErrors(parsed.errors);
      toast({
        variant: 'destructive',
        title: 'Could not import activity logs',
        description: parsed.errors[0],
      });
      return;
    }

    setValidationErrors([]);
    setActivityLogs(parsed.entries);
    saveFocusActivityLogs(parsed.entries);
    toast({
      title: 'Activity logs imported',
      description: `${parsed.entries.length} entry(s) are ready for audit.`,
    });
  }

  async function runAudit() {
    if (!activityJson.trim()) {
      toast({
        variant: 'destructive',
        title: 'No logs detected',
        description: 'Please input your activity logs in the "Activity Logs" tab first.',
      });
      return;
    }

    const doneTasks = tasks.filter(t => t.status === 'done').map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
    }));

    if (doneTasks.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No tasks to audit',
        description: 'You need at least one task marked as "Done" to run this audit.',
      });
      return;
    }

    const parsed = parseActivityLogJson(activityJson);
    if (parsed.errors.length > 0) {
      setValidationErrors(parsed.errors);
      return;
    }

    setIsAuditing(true);
    setValidationErrors([]);

    try {
      const result = await handleAuditTaskAlignment({
        doneTasks,
        activityLogs: parsed.entries.map(e => ({
          id: e.id,
          timestamp: e.timestamp,
          duration: e.duration,
          activity: e.activity
        }))
      });

      setTaskAuditResult(result);
      localStorage.setItem('focusWeave.focusAuditor.taskResult', JSON.stringify(result));
      
      toast({
        title: 'Task Audit Complete',
        description: `Your focus alignment is ${result.alignmentScore}%.`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Audit Failed',
        description: 'Failed to complete the AI semantic audit. Please try again.',
      });
    } finally {
      setIsAuditing(false);
    }
  }

  if (!isLoaded) {
    return <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center text-muted-foreground">Loading Focus Auditor...</div>;
  }

  const taskChartData = taskAuditResult?.taskBreakdown.map(item => ({
    name: item.taskName,
    minutes: item.actualMinutes,
  })) || [];

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <BrainCircuit className="h-6 w-6 text-primary" />
            Adaptive Focus Auditor
          </CardTitle>
          <CardDescription>
            The Task-Based Auditor uses AI to semantically map your activity logs to your actual completed tasks, measuring true productivity over just staying busy.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary" className="px-3 py-1 text-xs">Custom 24h profile</Badge>
            <Badge variant="secondary" className="px-3 py-1 text-xs">JSON log validation</Badge>
            <Badge variant="secondary" className="px-3 py-1 text-xs">Weighted alignment scoring</Badge>
            <Badge variant="secondary" className="px-3 py-1 text-xs">AI coaching insights</Badge>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={runAudit} disabled={isAuditing}>
              {isAuditing ? (
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Target className="mr-2 h-4 w-4" />
              )}
              {isAuditing ? 'Auditing...' : 'Run Task Audit'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {validationErrors.length > 0 ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Setup issues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-destructive">
            {validationErrors.slice(0, 5).map((error) => (
              <p key={error}>{error}</p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="plan" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plan">Plan Builder</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          <TabsTrigger value="results">Audit Results</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>Custom Profile Builder</CardTitle>
                  <CardDescription>
                    Each block defines what your ideal day should look like. Midnight-crossing blocks are supported.
                  </CardDescription>
                </div>
                <Button onClick={addPlanBlock} variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Block
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {planBlocks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-8 text-sm text-muted-foreground">
                    No plan blocks yet. Add one manually using the button above.
                  </div>
                ) : (
                  planBlocks.map((block) => (
                    <div key={block.id} className="rounded-2xl border border-border bg-background p-4">
                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="md:col-span-1">
                          <label className="mb-2 block text-sm font-medium">Label</label>
                          <Input
                            value={block.label ?? ''}
                            onChange={(event) => updatePlanBlock(block.id, { label: event.target.value })}
                            placeholder={FOCUS_AUDITOR_LABELS[block.type]}
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium">Type</label>
                          <Select
                            value={block.type}
                            onValueChange={(value) => updatePlanBlock(block.id, { type: value as FocusPlanType })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FOCUS_AUDITOR_PLAN_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {FOCUS_AUDITOR_LABELS[type]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium">Start</label>
                          <Input
                            type="time"
                            value={minuteToTimeLabel(block.startMinute)}
                            onChange={(event) => updatePlanBlock(block.id, { startMinute: timeLabelToMinute(event.target.value) })}
                          />
                        </div>
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <label className="block text-sm font-medium">End</label>
                            <Button variant="ghost" size="sm" onClick={() => removePlanBlock(block.id)}>Remove</Button>
                          </div>
                          <Input
                            type="time"
                            value={minuteToTimeLabel(block.endMinute)}
                            onChange={(event) => updatePlanBlock(block.id, { endMinute: timeLabelToMinute(event.target.value) })}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
 
            <FocusClock
              title="Planned Day Preview"
              subtitle="A circular view of your intended daily rhythm."
              segments={planTimeline}
              emptyLabel="Add plan blocks to see your circular schedule."
            />
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Activity Log Input
                </CardTitle>
                <CardDescription>
                  Paste JSON entries with `timestamp`, `duration`, and `activity`. Up to 200 entries, with timestamps in ISO 8601 or HH:mm format.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={activityJson}
                  onChange={(event) => setActivityJson(event.target.value)}
                  className="min-h-[360px] font-mono text-sm"
                  placeholder='[{"timestamp":"2026-04-14T09:00:00","duration":45,"activity":"focus"}]'
                />
                <div className="flex flex-wrap gap-3">
                  <Button onClick={importLogs}>
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Import Logs
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <FocusClock
                title="Actual Day Preview"
                subtitle="Imported activity logs rendered across the day."
                segments={actualTimeline}
                emptyLabel="Import activity logs to see your actual day map."
              />

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Imported Entries</CardTitle>
                  <CardDescription>
                    {activityLogs.length > 0 ? `${activityLogs.length} entry(s) ready for analysis.` : 'No activity entries imported yet.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-h-[320px] overflow-auto">
                  {activityLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Use the JSON import to load your actual activity data.</p>
                  ) : (
                    <div className="space-y-2">
                      {activityLogs.slice(0, 12).map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium">{FOCUS_AUDITOR_LABELS[entry.activity] || entry.activity}</p>
                            <p className="text-xs text-muted-foreground">{entry.notes || 'No note added'}</p>
                          </div>
                          <div className="text-right">
                            <p>{entry.duration} min</p>
                            <p className="text-xs text-muted-foreground">{entry.timestamp}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {!taskAuditResult ? (
            <Card className="shadow-sm">
              <CardContent className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <Target className="mb-4 h-12 w-12 text-muted-foreground/30" />
                <h3 className="text-xl font-semibold">Ready for Audit</h3>
                <p className="mt-2 max-w-xl text-muted-foreground">
                  The AI will compare your <strong>Done Tasks</strong> with your <strong>Activity Logs</strong>. 
                  It semantically matches site names and descriptions to your task names to uncover your true focus alignment.
                </p>
                <div className="mt-6 flex flex-col items-center gap-2">
                  <p className="text-sm font-medium">Requirements:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${tasks.filter(t => t.status === 'done').length > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                      At least one task marked as "Done"
                    </li>
                    <li className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${activityLogs.length > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                      Imported Activity Logs
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-md">
                  <CardHeader className="pb-2">
                    <CardDescription>Overall Alignment</CardDescription>
                    <CardTitle className="text-5xl font-extrabold tracking-tight">
                      {taskAuditResult.alignmentScore}
                      <span className="text-lg font-medium text-muted-foreground">%</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div 
                        className="h-full bg-primary transition-all duration-1000" 
                        style={{ width: `${taskAuditResult.alignmentScore}%` }} 
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription>Tracked Minutes</CardDescription>
                    <CardTitle className="text-4xl font-bold">{taskAuditResult.totalTrackedMinutes}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Total duration across all activity logs analyzed.
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription>Aligned Focus</CardDescription>
                    <CardTitle className="text-4xl font-bold">{taskAuditResult.alignedMinutes}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Minutes spent on activities that strongly match your done tasks.
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-6">
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-primary" />
                        Task Breakdown
                      </CardTitle>
                      <CardDescription>
                        Semantic time allocation per completed task.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Task Name</TableHead>
                            <TableHead className="text-right">Actual Time</TableHead>
                            <TableHead className="text-right">Weight</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {taskAuditResult.taskBreakdown.map((item) => (
                            <TableRow key={item.taskId} className="group transition-colors hover:bg-muted/30">
                              <TableCell className="font-medium">{item.taskName}</TableCell>
                              <TableCell className="text-right">{item.actualMinutes} min</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline" className="font-mono">
                                  {item.alignmentPercentage}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          {taskAuditResult.unrelatedMinutes > 0 && (
                            <TableRow className="bg-muted/20 italic">
                              <TableCell>Unrelated/Distractions</TableCell>
                              <TableCell className="text-right">{taskAuditResult.unrelatedMinutes} min</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary" className="text-muted-foreground">
                                  {taskAuditResult.totalTrackedMinutes > 0 
                                    ? Math.round((taskAuditResult.unrelatedMinutes / taskAuditResult.totalTrackedMinutes) * 100) 
                                    : 0}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card className="shadow-md">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChartIcon className="h-5 w-5 text-primary" />
                        Time Distribution Graph
                      </CardTitle>
                      <CardDescription>
                        Visual comparison of minutes spent per task category.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={taskChartData} layout="vertical" margin={{ left: 20, right: 30, top: 10 }}>
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={100} 
                            tick={{ fill: 'currentColor', fontSize: 12 }}
                          />
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <Bar 
                            dataKey="minutes" 
                            fill="hsl(var(--primary))" 
                            radius={[0, 4, 4, 0]} 
                            barSize={32}
                            label={{ position: 'right', fill: 'currentColor', fontSize: 11, formatter: (val: number) => `${val}m` }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="border-primary/20 bg-primary/5 shadow-md">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        AI Coach Insights
                      </CardTitle>
                      <CardDescription>
                        Deeper patterns identified by comparing your intent with actual behavior.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {taskAuditResult.insights.map((insight, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                            {idx + 1}
                          </div>
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {insight}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <FocusClock
                    title="Actual Day Map"
                    subtitle="Where your time actually went."
                    segments={actualTimeline}
                    emptyLabel="No logs to map."
                  />
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
