"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Edit, Trash2, MoreVertical, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  active_tasks_count: number;
  overdue_count: number;
}

interface SessionUser {
  id: string;
  name: string;
  role: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'member', password: '' });
  const [editMember, setEditMember] = useState({ name: '', email: '', role: 'member' });

  const fetchMembers = async () => {
    try {
      const [membersRes, tasksRes, userRes] = await Promise.all([
        fetch("/api/members"),
        fetch("/api/tasks"),
        fetch("/api/auth/session"),
      ]);

      const membersJson = await membersRes.json();
      const tasksJson = await tasksRes.json();
      const userJson = await userRes.json();

      const membersData = Array.isArray(membersJson.data) ? membersJson.data : Array.isArray(membersJson) ? membersJson : [];
      const tasksData = Array.isArray(tasksJson.data) ? tasksJson.data : Array.isArray(tasksJson) ? tasksJson : [];

      if (userJson?.user) {
        setCurrentUser({
          id: userJson.user.id,
          name: userJson.user.name,
          role: userJson.user.role,
        });
      }

      const memberMap: Record<string, { active: number; overdue: number }> = {};
      for (const m of membersData as Array<Record<string, string>>) {
        memberMap[m.id] = { active: 0, overdue: 0 };
      }
      const now = new Date().toISOString().split("T")[0];
      for (const t of tasksData as Array<Record<string, unknown>>) {
        const assignees = (t.assignees || []) as Array<Record<string, string>>;
        for (const a of assignees) {
          if (memberMap[a.id]) {
            if (t.status === "in_progress" || t.status === "todo" || t.status === "review") {
              memberMap[a.id].active++;
            }
            if (t.dueDate && t.dueDate < now && t.status !== "done" && t.status !== "cancelled") {
              memberMap[a.id].overdue++;
            }
          }
        }
      }

      const enriched: Member[] = membersData.map((m: Record<string, string>) => ({
        id: m.id,
        name: m.name,
        email: m.email || '',
        role: m.role,
        active_tasks_count: memberMap[m.id]?.active || 0,
        overdue_count: memberMap[m.id]?.overdue || 0,
      }));

      setMembers(enriched);
    } catch (error) {
      console.error("Failed to fetch team members:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMember),
      });
      const data = await res.json();
      if (res.ok) {
        setIsAddDialogOpen(false);
        setNewMember({ name: '', email: '', role: 'member', password: '' });
        fetchMembers();
      } else {
        alert(data.error || "新增失敗");
      }
    } catch (error) {
      console.error("Failed to add member:", error);
      alert("新增失敗");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`/api/members/${selectedMember.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editMember),
      });
      const data = await res.json();
      if (res.ok) {
        setIsEditDialogOpen(false);
        setSelectedMember(null);
        fetchMembers();
      } else {
        alert(data.error || "編輯失敗");
      }
    } catch (error) {
      console.error("Failed to edit member:", error);
      alert("編輯失敗");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`/api/members/${selectedMember.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setIsDeleteDialogOpen(false);
        setSelectedMember(null);
        fetchMembers();
      } else {
        alert(data.error || "刪除失敗");
      }
    } catch (error) {
      console.error("Failed to delete member:", error);
      alert("刪除失敗");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetAll = async () => {
    setResetLoading(true);
    try {
      const res = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "YES_DELETE_ALL_DATA" }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsResetDialogOpen(false);
        fetchMembers();
        alert("已成功清空所有資料！");
      } else {
        alert(data.error || "清空失敗");
      }
    } catch (error) {
      console.error("Failed to reset:", error);
      alert("清空失敗");
    } finally {
      setResetLoading(false);
    }
  };

  const openEditDialog = (member: Member) => {
    setSelectedMember(member);
    setEditMember({
      name: member.name,
      email: member.email,
      role: member.role,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (member: Member) => {
    setSelectedMember(member);
    setIsDeleteDialogOpen(true);
  };

  const chartData = members.map((member) => ({
    name: member.name,
    active_tasks: member.active_tasks_count,
    overdue: member.overdue_count,
  }));

  if (loading) {
    return (
      <div className="flex-1 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">團隊成員</h1>
          <p className="text-muted-foreground">查看和管理團隊成員</p>
        </div>
        <div className="flex gap-2">
          {currentUser?.role === 'admin' && (
            <>
              <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    清空所有資料
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>確認清空所有資料</DialogTitle>
                    <DialogDescription>
                      此操作將刪除所有任務、專案和成員（保留您的帳號）。此操作無法復原！
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsResetDialogOpen(false)} disabled={resetLoading}>
                      取消
                    </Button>
                    <Button variant="destructive" onClick={handleResetAll} disabled={resetLoading}>
                      {resetLoading ? "清空中..." : "確認清空"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    新增成員
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleAddMember}>
                    <DialogHeader>
                      <DialogTitle>新增團隊成員</DialogTitle>
                      <DialogDescription>
                        新增新成員到團隊
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">姓名</Label>
                        <Input
                          id="name"
                          value={newMember.name}
                          onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="email">電子郵件</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newMember.email}
                          onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="role">角色</Label>
                        <Select value={newMember.role} onValueChange={(value) => setNewMember({ ...newMember, role: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">成員</SelectItem>
                            <SelectItem value="admin">管理員</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="password">密碼（選填）</Label>
                        <Input
                          id="password"
                          type="password"
                          value={newMember.password}
                          onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                          placeholder="預設：default123"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        取消
                      </Button>
                      <Button type="submit" disabled={actionLoading}>
                        {actionLoading ? "新增中..." : "新增"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Workload Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>工作負載分佈</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="active_tasks" name="進行中任務" fill="#3B82F6" />
              <Bar dataKey="overdue" name="逾期任務" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Members Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <Card key={member.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="text-lg">
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{member.name}</h3>
                    <Badge variant={member.role === "admin" ? "default" : "secondary"} className="text-xs">
                      {member.role === "admin" ? "管理員" : "成員"}
                    </Badge>
                  </div>
                </div>
                {currentUser?.role === 'admin' && member.id !== currentUser.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(member)}>
                        <Edit className="w-4 h-4 mr-2" />
                        編輯
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDeleteDialog(member)} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        刪除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="text-sm text-muted-foreground mb-4">{member.email}</div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{member.active_tasks_count}</p>
                  <p className="text-xs text-muted-foreground">進行中任務</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{member.overdue_count}</p>
                  <p className="text-xs text-muted-foreground">逾期任務</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {members.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">暫無團隊成員</h3>
          <p className="text-muted-foreground mb-4">您是唯一的成員</p>
          {currentUser?.role === 'admin' && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              新增第一位成員
            </Button>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEditMember}>
            <DialogHeader>
              <DialogTitle>編輯成員</DialogTitle>
              <DialogDescription>
                修改成員資訊
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">姓名</Label>
                <Input
                  id="edit-name"
                  value={editMember.name}
                  onChange={(e) => setEditMember({ ...editMember, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">電子郵件</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editMember.email}
                  onChange={(e) => setEditMember({ ...editMember, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-role">角色</Label>
                <Select value={editMember.role} onValueChange={(value) => setEditMember({ ...editMember, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">成員</SelectItem>
                    <SelectItem value="admin">管理員</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={actionLoading}>
                {actionLoading ? "儲存中..." : "儲存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>刪除成員</DialogTitle>
            <DialogDescription>
              確定要刪除成員「{selectedMember?.name}」嗎？
              <br />
              此操作將刪除該成員的所有相關資料。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={actionLoading}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteMember} disabled={actionLoading}>
              {actionLoading ? "刪除中..." : "確認刪除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
