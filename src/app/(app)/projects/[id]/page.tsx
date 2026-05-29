"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Pencil, Archive, LayoutGrid, Kanban, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from "recharts";

interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  status: string;
  progress: number;
  owner: {
    id: string;
    name: string;
  };
  start_date: string | null;
  due_date: string | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assignees: Array<{ id: string; name: string }>;
}

interface Stats {
  status_distribution: Array<{ name: string; value: number }>;
  member_contribution: Array<{ name: string; tasks: number }>;
  completion_trend: Array<{ date: string; completed: number }>;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tasks");

  useEffect(() => {
    fetchProjectDetail();
  }, [projectId]);

  const fetchProjectDetail = async () => {
    try {
      const [projectRes, tasksRes, statsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/tasks`),
        fetch(`/api/projects/${projectId}/stats`),
      ]);

      const projectJson = await projectRes.json();
      const tasksJson = await tasksRes.json();
      const statsJson = await statsRes.json();

      // API returns { data: {...} } — unwrap and map camelCase → snake_case
      const rawProject = projectJson.data || projectJson;
      setProject({
        id: rawProject.id,
        name: rawProject.name,
        description: rawProject.description || "",
        color: rawProject.color || "#6B7280",
        status: rawProject.status || "active",
        progress: rawProject.progressPercentage ?? rawProject.progress ?? 0,
        owner: rawProject.owner || { id: rawProject.ownerId, name: "未知" },
        start_date: rawProject.startDate ?? rawProject.start_date ?? null,
        due_date: rawProject.dueDate ?? rawProject.due_date ?? null,
      });

      const rawTasks = tasksJson.data || tasksJson || [];
      setTasks(rawTasks.map((t: Record<string, unknown>) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        due_date: t.dueDate ?? t.due_date ?? null,
        assignees: t.assignees || [],
      })));

      const rawStats = statsJson.data || statsJson;
      setStats(rawStats || null);
    } catch (error) {
      console.error("Failed to fetch project detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "todo": return "todo";
      case "in_progress": return "in_progress";
      case "review": return "review";
      case "done": return "done";
      case "cancelled": return "cancelled";
      default: return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      todo: "待辦",
      in_progress: "進行中",
      review: "審核中",
      done: "已完成",
      cancelled: "已取消",
    };
    return labels[status] || status;
  };

  if (loading || !project) {
    return (
      <div className="flex-1 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-3/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          </div>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Pencil className="w-4 h-4 mr-2" />
            編輯
          </Button>
          <Button variant="outline" size="sm">
            <Archive className="w-4 h-4 mr-2" />
            封存
          </Button>
        </div>
      </div>

      {/* Progress */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">專案進度</span>
              <span className="text-sm font-medium">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="tasks">
            <LayoutGrid className="w-4 h-4 mr-2" />
            任務清單
          </TabsTrigger>
          <TabsTrigger value="board">
            <Kanban className="w-4 h-4 mr-2" />
            看板
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="w-4 h-4 mr-2" />
            統計
          </TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>所有任務</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    暫無任務
                  </p>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            task.priority === "p0"
                              ? "bg-priority-p0"
                              : task.priority === "p1"
                              ? "bg-priority-p1"
                              : task.priority === "p2"
                              ? "bg-priority-p2"
                              : "bg-priority-p3"
                          }`}
                        />
                        <span className="font-medium">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={getStatusBadgeVariant(task.status)}>
                          {getStatusLabel(task.status)}
                        </Badge>
                        <div className="flex -space-x-2">
                          {task.assignees.slice(0, 3).map((assignee) => (
                            <Avatar key={assignee.id} className="w-6 h-6 border-2 border-background">
                              <AvatarFallback className="text-xs">
                                {assignee.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Board Tab */}
        <TabsContent value="board">
          <div className="grid grid-cols-5 gap-4">
            {["todo", "in_progress", "review", "done", "cancelled"].map((status) => {
              const statusTasks = tasks.filter((t) => t.status === status);
              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{getStatusLabel(status)}</h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {statusTasks.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {statusTasks.map((task) => (
                      <Card key={task.id} className="p-3">
                        <p className="text-sm font-medium">{task.title}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex -space-x-2">
                            {task.assignees.slice(0, 2).map((assignee) => (
                              <Avatar key={assignee.id} className="w-5 h-5 border-2 border-card">
                                <AvatarFallback className="text-xs">
                                  {assignee.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          {task.due_date && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(task.due_date).toLocaleDateString("zh-TW", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">狀態分佈</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.status_distribution && (
                  <PieChart width={300} height={300}>
                    <Pie
                      data={stats.status_distribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={((props: { name?: string; percent?: number }) => `${props.name ?? ''}: ${((props.percent ?? 0) * 100).toFixed(0)}%`) as unknown as boolean}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.status_distribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.name === "待辦"
                              ? "#9ca3af"
                              : entry.name === "進行中"
                              ? "#2980b9"
                              : entry.name === "審核中"
                              ? "#f39c12"
                              : entry.name === "已完成"
                              ? "#27ae60"
                              : "#e74c3c"
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                )}
              </CardContent>
            </Card>

            {/* Member Contribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">成員貢獻</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.member_contribution && (
                  <BarChart width={300} height={300} data={stats.member_contribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="tasks" fill="#3B82F6" />
                  </BarChart>
                )}
              </CardContent>
            </Card>

            {/* Completion Trend */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">完成趨勢</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.completion_trend && (
                  <LineChart width={800} height={300} data={stats.completion_trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="completed" stroke="#27ae60" strokeWidth={2} />
                  </LineChart>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
