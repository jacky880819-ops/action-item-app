"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Member {
  id: string;
  name: string;
  role: string;
}

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const presetColors = [
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Green
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#6B7280", // Gray
];

export function CreateProjectDialog({ open, onOpenChange, onSuccess }: CreateProjectDialogProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(presetColors[0]);
  const [ownerId, setOwnerId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/members")
        .then((res) => res.json())
        .then((json) => {
          // API returns { data: [...] } — unwrap
          const data = json.data || json || [];
          setMembers(data);
          if (data.length > 0) {
            setOwnerId(data[0].id);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch members:", error);
        });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !ownerId) return;

    setLoading(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          color,
          ownerId,
          startDate: startDate || null,
          dueDate: dueDate || null,
        }),
      });

      if (res.ok) {
        onSuccess?.();
        // Reset form
        setName("");
        setDescription("");
        setColor(presetColors[0]);
        setOwnerId("");
        setStartDate("");
        setDueDate("");
      } else {
        const error = await res.json();
        console.error("Failed to create project:", error);
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>新增專案</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">名稱 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="輸入專案名稱"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="輸入專案描述"
              rows={3}
            />
          </div>

          <div>
            <Label>顏色</Label>
            <div className="flex gap-2 mt-2">
              {presetColors.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    color === presetColor
                      ? "border-black scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => setColor(presetColor)}
                />
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="owner">負責人 *</Label>
            <Select value={ownerId} onValueChange={setOwnerId} required>
              <SelectTrigger>
                <SelectValue placeholder="選擇負責人" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} ({member.role === "admin" ? "管理員" : "成員"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">開始日期</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="dueDate">結束日期</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !name || !ownerId}
          >
            {loading ? "新增中..." : "新增專案"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
