"use client";

import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

const columns = [
  { id: "todo", title: "待辦", color: "bg-zinc-500" },
  { id: "in_progress", title: "進行中", color: "bg-blue-500" },
  { id: "review", title: "審核中", color: "bg-amber-500" },
  { id: "done", title: "已完成", color: "bg-green-500" },
  { id: "cancelled", title: "已取消", color: "bg-red-500" },
] as const;

export default function TasksBoardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogStatus, setCreateDialogStatus] = useState<string>("todo");

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      const json = await res.json();
      // Safely coerce API response to array
      const rawTasks = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      const data: Task[] = rawTasks.map((t: Record<string, unknown>) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        due_date: t.dueDate ?? t.due_date ?? null,
        project: t.project || { id: t.projectId, name: "", color: "#6B7280" },
        assignees: Array.isArray(t.assignees) ? t.assignees : [],
      }));
      setTasks(data);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as Task["status"];

    // Optimistic update
    setTasks((prev) =>
      prev.map((task) =>
        task.id === draggableId ? { ...task, status: newStatus } : task
      )
    );

    // API call
    try {
      await fetch(`/api/tasks/${draggableId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (error) {
      console.error("Failed to update task status:", error);
      // Revert on error
      fetchTasks();
    }
  };

  const getPriorityBorderColor = (priority: string) => {
    switch (priority) {
      case "p0":
        return "border-l-priority-p0";
      case "p1":
        return "border-l-priority-p1";
      case "p2":
        return "border-l-priority-p2";
      case "p3":
        return "border-l-priority-p3";
      default:
        return "border-l-gray-400";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("zh-TW", {
      month: "short",
      day: "numeric",
    });
  };

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === "done") return false;
    return new Date(task.due_date) < new Date();
  };

  if (loading) {
    return (
      <div className="flex-1 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-96 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">任務看板</h1>
          <p className="text-muted-foreground">拖曳任務卡片更新狀態</p>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-5 gap-4 h-[calc(100vh-200px)]">
          {columns.map((column) => {
            const columnTasks = tasks.filter((task) => task.status === column.id);

            return (
              <div key={column.id} className="flex flex-col h-full">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${column.color}`} />
                    <h2 className="font-semibold">{column.title}</h2>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {columnTasks.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setCreateDialogStatus(column.id);
                      setCreateDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 rounded-lg p-2 transition-colors ${
                        snapshot.isDraggingOver ? "bg-muted/50" : "bg-transparent"
                      }`}
                    >
                      <div className="space-y-2">
                        {columnTasks.map((task, index) => (
                          <Draggable
                            key={task.id}
                            draggableId={task.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`group bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow ${
                                  snapshot.isDragging ? "shadow-lg rotate-2" : ""
                                } ${getPriorityBorderColor(task.priority)} border-l-4`}
                                style={{
                                  ...provided.draggableProps.style,
                                }}
                              >
                                <div className="space-y-2">
                                  <p className="text-sm font-medium line-clamp-2">
                                    {task.title}
                                  </p>

                                  <div className="flex items-center justify-between">
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
                                    {isOverdue(task) && (
                                      <span className="text-xs text-red-600 font-medium">
                                        逾期
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between pt-2 border-t">
                                    <div className="flex -space-x-2">
                                      {task.assignees.slice(0, 3).map((assignee) => (
                                        <Avatar
                                          key={assignee.id}
                                          className="w-5 h-5 border-2 border-card"
                                        >
                                          <AvatarFallback className="text-xs">
                                            {assignee.name.charAt(0).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                      ))}
                                      {task.assignees.length > 3 && (
                                        <div className="w-5 h-5 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px]">
                                          +{task.assignees.length - 3}
                                        </div>
                                      )}
                                    </div>
                                    {task.due_date && (
                                      <span
                                        className={`text-xs ${
                                          isOverdue(task)
                                            ? "text-red-600 font-medium"
                                            : "text-muted-foreground"
                                        }`}
                                      >
                                        {formatDate(task.due_date)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultStatus={createDialogStatus}
        onSuccess={() => {
          setCreateDialogOpen(false);
          fetchTasks();
        }}
      />
    </div>
  );
}
