"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import {
  Pencil,
  Save,
  X,
  Send,
  Paperclip,
  Clock,
  User,
  Tag,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "review" | "done" | "cancelled";
  priority: "p0" | "p1" | "p2" | "p3";
  due_date: string | null;
  created_at: string;
  updated_at: string;
  project: {
    id: string;
    name: string;
    color: string;
  };
  assignees: Array<{
    id: string;
    name: string;
  }>;
  labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    name: string;
  };
}

interface Activity {
  id: string;
  type: string;
  description: string;
  created_at: string;
  user: {
    id: string;
    name: string;
  };
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");

  // Comment state
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    fetchTaskDetail();
  }, [taskId]);

  const fetchTaskDetail = async () => {
    try {
      const [taskRes, commentsRes] = await Promise.all([
        fetch(`/api/tasks/${taskId}`),
        fetch(`/api/tasks/${taskId}/comments`),
      ]);

      const taskJson = await taskRes.json();
      const commentsJson = await commentsRes.json();

      // API returns { data: {...} } — unwrap and map camelCase → snake_case
      const rawTask = taskJson.data || taskJson;
      const taskData: Task = {
        id: rawTask.id,
        title: rawTask.title,
        description: rawTask.description || "",
        status: rawTask.status,
        priority: rawTask.priority,
        due_date: rawTask.dueDate ?? rawTask.due_date ?? null,
        created_at: rawTask.createdAt || rawTask.created_at || "",
        updated_at: rawTask.updatedAt || rawTask.updated_at || "",
        project: rawTask.project || { id: rawTask.projectId, name: "", color: "#6B7280" },
        assignees: (rawTask.assignees || []).map((a: Record<string, unknown>) => ({
          id: a.id,
          name: a.name,
        })),
        labels: (rawTask.labels || []).map((l: Record<string, unknown>) => ({
          id: l.id,
          name: l.name,
          color: l.color,
        })),
      };

      const commentsData: Comment[] = (Array.isArray(commentsJson.data) ? commentsJson.data : Array.isArray(commentsJson) ? commentsJson : []).map((c: Record<string, unknown>) => ({
        id: c.id,
        content: c.content || c.body || "",
        created_at: c.createdAt || c.created_at || "",
        user: c.user || { id: c.userId, name: "未知" },
      }));

      setTask(taskData);
      setComments(commentsData);
      setEditedTitle(taskData.title);
      setEditedDescription(taskData.description || "");
    } catch (error) {
      console.error("Failed to fetch task detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!task || editedTitle === task.title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editedTitle }),
      });

      if (res.ok) {
        const json = await res.json();
        const updated = json.data || json;
        setTask((prev) => prev ? { ...prev, ...updated, due_date: updated.dueDate ?? updated.due_date ?? prev.due_date, project: updated.project || prev.project, assignees: updated.assignees || prev.assignees, labels: updated.labels || prev.labels, created_at: updated.createdAt || prev.created_at, updated_at: updated.updatedAt || prev.updated_at } : prev);
        setIsEditingTitle(false);
      }
    } catch (error) {
      console.error("Failed to update title:", error);
    }
  };

  const handleSaveDescription = async () => {
    if (!task || editedDescription === task.description) {
      setIsEditingDescription(false);
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editedDescription }),
      });

      if (res.ok) {
        const json = await res.json();
        const updated = json.data || json;
        setTask((prev) => prev ? { ...prev, ...updated, due_date: updated.dueDate ?? updated.due_date ?? prev.due_date, project: updated.project || prev.project, assignees: updated.assignees || prev.assignees, labels: updated.labels || prev.labels, created_at: updated.createdAt || prev.created_at, updated_at: updated.updatedAt || prev.updated_at } : prev);
        setIsEditingDescription(false);
      }
    } catch (error) {
      console.error("Failed to update description:", error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const json = await res.json();
        const updated = json.data || json;
        setTask((prev) => prev ? { ...prev, ...updated, due_date: updated.dueDate ?? updated.due_date ?? prev.due_date, project: updated.project || prev.project, assignees: updated.assignees || prev.assignees, labels: updated.labels || prev.labels, created_at: updated.createdAt || prev.created_at, updated_at: updated.updatedAt || prev.updated_at } : prev);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!task) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: newPriority }),
      });

      if (res.ok) {
        const json = await res.json();
        const updated = json.data || json;
        setTask((prev) => prev ? { ...prev, ...updated, due_date: updated.dueDate ?? updated.due_date ?? prev.due_date, project: updated.project || prev.project, assignees: updated.assignees || prev.assignees, labels: updated.labels || prev.labels, created_at: updated.createdAt || prev.created_at, updated_at: updated.updatedAt || prev.updated_at } : prev);
      }
    } catch (error) {
      console.error("Failed to update priority:", error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });

      if (res.ok) {
        const json = await res.json();
        const comment = json.data || json;
        setComments((prev) => [...prev, {
          id: comment.id,
          content: comment.content || comment.body || "",
          created_at: comment.createdAt || comment.created_at || "",
          user: comment.user || { id: comment.userId, name: "未知" },
        }]);
        setNewComment("");
      }
    } catch (error) {
      console.error("Failed to submit comment:", error);
    } finally {
      setSubmittingComment(false);
    }
  };

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

  if (loading || !task) {
    return (
      <div className="flex-1 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-3/4"></div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left: Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Title */}
          <div className="flex items-start gap-4">
            {isEditingTitle ? (
              <div className="flex-1 flex items-center gap-2">
                <Textarea
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="flex-1 min-h-[40px]"
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveTitle}>
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditedTitle(task.title);
                    setIsEditingTitle(false);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold flex-1">{task.title}</h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingTitle(true)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          {/* Description */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">描述</CardTitle>
                {isEditingDescription ? (
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleSaveDescription}>
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditedDescription(task.description || "");
                        setIsEditingDescription(false);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingDescription(true)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditingDescription ? (
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="min-h-[200px]"
                  autoFocus
                />
              ) : (
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {task.description || "暫無描述"}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">評論</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] mb-4">
                <div className="space-y-4">
                  {comments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      暫無評論
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>
                            {comment.user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {comment.user.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.created_at), {
                                addSuffix: true,
                                locale: zhTW,
                              })}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{comment.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <form onSubmit={handleSubmitComment} className="flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="新增評論..."
                  className="flex-1 min-h-[80px]"
                />
                <Button type="submit" size="sm" disabled={submittingComment || !newComment.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">活動記錄</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  {activities.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      暫無活動記錄
                    </p>
                  ) : (
                    activities.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {activity.user.name} ·{" "}
                            {formatDistanceToNow(new Date(activity.created_at), {
                              addSuffix: true,
                              locale: zhTW,
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">狀態</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={task.status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">待辦</SelectItem>
                  <SelectItem value="in_progress">進行中</SelectItem>
                  <SelectItem value="review">審核中</SelectItem>
                  <SelectItem value="done">已完成</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">優先級</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={task.priority} onValueChange={handlePriorityChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="p0">P0 緊急</SelectItem>
                  <SelectItem value="p1">P1 高</SelectItem>
                  <SelectItem value="p2">P2 中</SelectItem>
                  <SelectItem value="p3">P3 低</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">專案</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4" />
                負責人
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex -space-x-2">
                {task.assignees.map((assignee) => (
                  <Avatar key={assignee.id} className="w-8 h-8 border-2 border-card">
                    <AvatarFallback className="text-xs">
                      {assignee.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                期限
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                <span className="text-muted-foreground text-sm">未設定</span>
              )}
            </CardContent>
          </Card>

          {task.labels && task.labels.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  標籤
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {task.labels.map((label) => (
                    <Badge
                      key={label.id}
                      variant="outline"
                      style={{
                        backgroundColor: `${label.color}20`,
                        borderColor: label.color,
                        color: label.color,
                      }}
                    >
                      {label.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
