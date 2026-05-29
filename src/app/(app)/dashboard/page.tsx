"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  task_id?: string;
}

interface Stats {
  todo: number;
  in_progress: number;
  overdue: number;
  done: number;
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<Stats>({ todo: 0, in_progress: 0, overdue: 0, done: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [tasksRes, notificationsRes] = await Promise.all([
          fetch("/api/tasks?assignee_id=me"),
          fetch("/api/notifications"),
        ]);

        const tasksJson = await tasksRes.json();
        const notificationsJson = await notificationsRes.json();

        // Safely coerce API responses to arrays (handles { data: [...] }, bare arrays, error objects, etc.)
        const rawTasks = Array.isArray(tasksJson.data)
          ? tasksJson.data
          : Array.isArray(tasksJson)
            ? tasksJson
            : [];
        const rawNotifications = Array.isArray(notificationsJson.data)
          ? notificationsJson.data
          : Array.isArray(notificationsJson)
            ? notificationsJson
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

        const notificationsData: Notification[] = rawNotifications.map((n: Record<string, unknown>) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.body || n.message || "",
          is_read: !!n.readAt,
          created_at: n.createdAt || n.created_at || "",
          task_id: n.taskId || n.task_id,
        }));

        setTasks(tasksData);
        setNotifications(notificationsData.slice(0, 5));

        // Calculate stats
        const now = new Date();
        setStats({
          todo: tasksData.filter((t) => t.status === "todo").length,
          in_progress: tasksData.filter((t) => t.status === "in_progress").length,
          overdue: tasksData.filter(
            (t) => t.due_date && new Date(t.due_date) < now && t.status !== "done"
          ).length,
          done: tasksData.filter((t) => t.status === "done").length,
        });
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
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

  if (loading) {
    return (
      <div className="flex-1 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">儀表板</h1>
        <p className="text-muted-foreground">歡迎回來，這是您的任務概覽</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待辦任務</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todo}</div>
            <p className="text-xs text-muted-foreground">等待開始的任務</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">進行中</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.in_progress}</div>
            <p className="text-xs text-muted-foreground">正在執行的任務</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">逾期</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">已超過期限</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已完成</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.done}</div>
            <p className="text-xs text-muted-foreground">已完成的任務</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Tasks List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>我的任務</span>
              <Link
                href="/tasks"
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
              >
                查看全部 <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    暫無任務
                  </div>
                ) : (
                  tasks.slice(0, 10).map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="group flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className={`w-2 h-2 rounded-full ${getPriorityDotColor(task.priority)} flex-shrink-0`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-blue-600 transition-colors">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant={getStatusBadgeVariant(task.status)}
                              className="text-xs"
                            >
                              {getStatusLabel(task.status)}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{
                                backgroundColor: `${task.project.color}20`,
                                borderColor: task.project.color,
                                color: task.project.color,
                              }}
                            >
                              {task.project.name}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex -space-x-2">
                          {task.assignees.slice(0, 3).map((assignee) => (
                            <Avatar key={assignee.id} className="w-6 h-6 border-2 border-background">
                              <AvatarFallback className="text-xs">
                                {assignee.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        {task.due_date && (
                          <span
                            className={`text-xs ${
                              new Date(task.due_date) < new Date() && task.status !== "done"
                                ? "text-red-600 font-medium"
                                : "text-muted-foreground"
                            }`}
                          >
                            {new Date(task.due_date).toLocaleDateString("zh-TW")}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Panel - Notifications & Overdue */}
        <div className="space-y-6">
          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">最近通知</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  {notifications.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      暫無通知
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 rounded-lg border ${
                          notification.is_read ? "bg-background" : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {notification.type === "assigned" && (
                            <LayoutDashboard className="h-4 w-4 text-blue-600 mt-0.5" />
                          )}
                          {notification.type === "overdue" && (
                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                          )}
                          {notification.type === "completed" && (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{notification.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                                locale: zhTW,
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Overdue Alerts */}
          {stats.overdue > 0 && (
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="text-lg text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  逾期警告
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[150px]">
                  <div className="space-y-2">
                    {tasks
                      .filter(
                        (t) =>
                          t.due_date &&
                          new Date(t.due_date) < new Date() &&
                          t.status !== "done"
                      )
                      .slice(0, 5)
                      .map((task) => (
                        <Link
                          key={task.id}
                          href={`/tasks/${task.id}`}
                          className="block p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        >
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <p className="text-xs text-red-600 mt-1">
                            逾期 {formatDistanceToNow(new Date(task.due_date!), { locale: zhTW })}
                          </p>
                        </Link>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
