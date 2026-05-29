"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";

interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  status: string;
  progress: number;
  task_count: number;
  task_counts_by_status: {
    todo: number;
    in_progress: number;
    review: number;
    done: number;
    cancelled: number;
  };
  overdue_count: number;
  owner: {
    id: string;
    name: string;
  };
  start_date: string | null;
  due_date: string | null;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects/overview");
      const json = await res.json();
      // Safely coerce API response to array
      const rawProjects = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      const data: Project[] = rawProjects.map((p: Record<string, unknown>) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        color: p.color || "#6B7280",
        status: p.status || "active",
        progress: p.progressPercentage ?? p.progress ?? 0,
        task_count: p.totalTasks ?? p.task_count ?? 0,
        task_counts_by_status: p.task_counts_by_status || {
          todo: 0, in_progress: 0, review: 0, done: 0, cancelled: 0,
        },
        overdue_count: p.overdueCount ?? p.overdue_count ?? 0,
        owner: p.owner || { id: p.ownerId, name: "未知" },
        start_date: p.startDate ?? p.start_date ?? null,
        due_date: p.dueDate ?? p.due_date ?? null,
      }));
      setProjects(data);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "未設定";
    return new Date(dateString).toLocaleDateString("zh-TW");
  };

  if (loading) {
    return (
      <div className="flex-1 p-8">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-10 bg-muted rounded w-32"></div>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded"></div>
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
          <h1 className="text-3xl font-bold tracking-tight">專案列表</h1>
          <p className="text-muted-foreground">管理所有專案</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          新增專案
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => router.push(`/projects/${project.id}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <CardTitle className="text-lg">{project.name}</CardTitle>
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.description}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">進度</span>
                  <span className="font-medium">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-2" />
              </div>

              {/* Task Counts */}
              <div className="flex flex-wrap gap-2">
                {project.task_counts_by_status.todo > 0 && (
                  <Badge variant="todo" className="text-xs">
                    待辦 {project.task_counts_by_status.todo}
                  </Badge>
                )}
                {project.task_counts_by_status.in_progress > 0 && (
                  <Badge variant="in_progress" className="text-xs">
                    進行中 {project.task_counts_by_status.in_progress}
                  </Badge>
                )}
                {project.task_counts_by_status.review > 0 && (
                  <Badge variant="review" className="text-xs">
                    審核中 {project.task_counts_by_status.review}
                  </Badge>
                )}
                {project.task_counts_by_status.done > 0 && (
                  <Badge variant="done" className="text-xs">
                    已完成 {project.task_counts_by_status.done}
                  </Badge>
                )}
              </div>

              {/* Overdue */}
              {project.overdue_count > 0 && (
                <Badge variant="destructive" className="text-xs">
                  逾期 {project.overdue_count}
                </Badge>
              )}

              <Separator />

              {/* Owner & Dates */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{project.owner.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(project.due_date)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">暫無專案</p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新增第一個專案
          </Button>
        </div>
      )}

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false);
          fetchProjects();
        }}
      />
    </div>
  );
}

import { Separator } from "@/components/ui/separator";
