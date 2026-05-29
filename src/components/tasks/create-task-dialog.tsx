"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Project {
  id: string;
  name: string;
}

interface Member {
  id: string;
  name: string;
  role: string;
}

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultStatus?: string;
}

export function CreateTaskDialog({ open, onOpenChange, onSuccess, defaultStatus }: CreateTaskDialogProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("p2");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState(defaultStatus || "todo");

  useEffect(() => {
    if (open) {
      // Fetch projects and members
      Promise.all([
        fetch("/api/projects?status=active").then((res) => res.json()),
        fetch("/api/members").then((res) => res.json()),
      ])
        .then(([projectsJson, membersJson]) => {
          // API returns { data: [...] } — unwrap
          setProjects(projectsJson.data || projectsJson || []);
          setMembers(membersJson.data || membersJson || []);
        })
        .catch((error) => {
          console.error("Failed to fetch data:", error);
        });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !projectId) return;

    setLoading(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          projectId,
          description,
          priority,
          assigneeIds,
          dueDate: dueDate || null,
          status,
        }),
      });

      if (res.ok) {
        onSuccess?.();
        // Reset form
        setTitle("");
        setProjectId("");
        setDescription("");
        setPriority("p2");
        setAssigneeIds([]);
        setDueDate("");
        setStatus("todo");
      } else {
        const error = await res.json();
        console.error("Failed to create task:", error);
      }
    } catch (error) {
      console.error("Failed to create task:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAssignee = (memberId: string) => {
    setAssigneeIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>新增任務</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4">
          <div>
            <Label htmlFor="title">標題 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="輸入任務標題"
              required
            />
          </div>

          <div>
            <Label htmlFor="project">專案 *</Label>
            <Select value={projectId} onValueChange={setProjectId} required>
              <SelectTrigger>
                <SelectValue placeholder="選擇專案" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="輸入任務描述"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">優先級</Label>
              <Select value={priority} onValueChange={setPriority}>
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
            </div>

            <div>
              <Label htmlFor="status">狀態</Label>
              <Select value={status} onValueChange={setStatus}>
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
            </div>
          </div>

          <div>
            <Label htmlFor="dueDate">期限</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div>
            <Label>負責人</Label>
            <ScrollArea className="h-[150px] border rounded-md p-3 mt-2">
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`member-${member.id}`}
                        checked={assigneeIds.includes(member.id)}
                        onCheckedChange={() => toggleAssignee(member.id)}
                      />
                      <Label
                        htmlFor={`member-${member.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {member.name}
                      </Label>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {member.role === "admin" ? "管理員" : "成員"}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </form>

        <DialogFooter className="border-t pt-4 mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !title || !projectId}
          >
            {loading ? "新增中..." : "新增任務"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
