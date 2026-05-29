"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";

interface Task {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "review" | "done" | "cancelled";
  priority: "p0" | "p1" | "p2" | "p3";
  due_date: string | null;
  project: {
    id: string;
    name: string;
    color: string;
  };
  assignees: Array<{
    id: string;
    name: string;
  }>;
}

interface Project {
  id: string;
  name: string;
}

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Filters
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [tasksRes, projectsRes] = await Promise.all([
          fetch("/api/tasks"),
          fetch("/api/projects?status=active"),
        ]);

        const tasksJson = await tasksRes.json();
        const projectsJson = await projectsRes.json();

        // Safely coerce API responses to arrays
        const rawTasks = Array.isArray(tasksJson.data)
          ? tasksJson.data
          : Array.isArray(tasksJson)
            ? tasksJson
            : [];
        const rawProjects = Array.isArray(projectsJson.data)
          ? projectsJson.data
          : Array.isArray(projectsJson)
            ? projectsJson
            : [];

        // Map camelCase → snake_case for tasks
        const tasksData: Task[] = rawTasks.map((t: Record<string, unknown>) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          due_date: t.dueDate ?? t.due_date ?? null,
          project: t.project || { id: t.projectId, name: "", color: "#6B7280" },
          assignees: Array.isArray(t.assignees) ? t.assignees : [],
        }));

        const projectsData: Project[] = rawProjects.map((p: Record<string, unknown>) => ({
          id: p.id,
          name: p.name,
        }));

        setTasks(tasksData);
        setProjects(projectsData);
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "todo":
        return "todo";
      case "in_progress":
        return "in_progress";
      case "review":
        return "review";
      case "done":
        return "done";
      case "cancelled":
        return "cancelled";
      default:
        return "default";
    }
  };

  const getPriorityDotColor = (priority: string) => {
    switch (priority) {
      case "p0":
        return "bg-priority-p0";
      case "p1":
        return "bg-priority-p1";
      case "p2":
        return "bg-priority-p2";
      case "p3":
        return "bg-priority-p3";
      default:
        return "bg-gray-400";
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

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      p0: "P0 緊急",
      p1: "P1 高",
      p2: "P2 中",
      p3: "P3 低",
    };
    return labels[priority] || priority;
  };

  const filteredTasks = tasks.filter((task) => {
    if (projectFilter !== "all" && task.project.id !== projectFilter) return false;
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex-1 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">任務列表</h1>
          <p className="text-muted-foreground">管理所有任務</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          新增任務
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Input
          placeholder="搜尋任務..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-[300px]"
        />

        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="選擇專案" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部專案</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="選擇狀態" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部狀態</SelectItem>
            <SelectItem value="todo">待辦</SelectItem>
            <SelectItem value="in_progress">進行中</SelectItem>
            <SelectItem value="review">審核中</SelectItem>
            <SelectItem value="done">已完成</SelectItem>
            <SelectItem value="cancelled">已取消</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="選擇優先級" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部優先級</SelectItem>
            <SelectItem value="p0">P0 緊急</SelectItem>
            <SelectItem value="p1">P1 高</SelectItem>
            <SelectItem value="p2">P2 中</SelectItem>
            <SelectItem value="p3">P3 低</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[400px]">標題</TableHead>
              <TableHead>專案</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>優先級</TableHead>
              <TableHead>負責人</TableHead>
              <TableHead>期限</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  暫無任務
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((task) => (
                <TableRow
                  key={task.id}
                  onClick={() => router.push(`/tasks/${task.id}`)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${getPriorityDotColor(task.priority)}`}
                      />
                      {task.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      style={{
                        backgroundColor: `${task.project.color}20`,
                        borderColor: task.project.color,
                        color: task.project.color,
                      }}
                    >
                      {task.project.name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(task.status)}>
                      {getStatusLabel(task.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{getPriorityLabel(task.priority)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex -space-x-2">
                      {task.assignees.slice(0, 3).map((assignee) => (
                        <Avatar key={assignee.id} className="w-6 h-6 border-2 border-background">
                          <AvatarFallback className="text-xs">
                            {assignee.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {task.assignees.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                          +{task.assignees.length - 3}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {task.due_date ? (
                      <span
                        className={
                          new Date(task.due_date) < new Date() && task.status !== "done"
                            ? "text-red-600 font-medium"
                            : "text-sm"
                        }
                      >
                        {new Date(task.due_date).toLocaleDateString("zh-TW")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false);
          // Refresh tasks
          fetch("/api/tasks")
            .then((res) => res.json())
            .then((json) => {
              const rawTasks = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
              const tasksData = rawTasks.map((t: Record<string, unknown>) => ({
                id: t.id,
                title: t.title,
                status: t.status,
                priority: t.priority,
                due_date: t.dueDate ?? t.due_date ?? null,
                project: t.project || { id: t.projectId, name: "", color: "#6B7280" },
                assignees: Array.isArray(t.assignees) ? t.assignees : [],
              }));
              setTasks(tasksData);
            });
        }}
      />
    </div>
  );
}

import { Card } from "@/components/ui/card";
