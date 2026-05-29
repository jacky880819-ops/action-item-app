"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Archive, UserPlus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Project {
  id: string;
  name: string;
  status: string;
  color: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface Label {
  id: string;
  name: string;
  color: string;
}

export default function SettingsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [addProjectDialogOpen, setAddProjectDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [editLabelDialogOpen, setEditLabelDialogOpen] = useState(false);

  // User settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then((res) => res.json()),
      fetch("/api/members").then((res) => res.json()),
      fetch("/api/labels").then((res) => res.json().catch(() => ({ data: [] }))),
    ])
      .then(([projectsJson, membersJson, labelsJson]) => {
        // Safely coerce API responses to arrays
        const rawProjects = Array.isArray(projectsJson.data)
          ? projectsJson.data
          : Array.isArray(projectsJson)
            ? projectsJson
            : [];
        const rawMembers = Array.isArray(membersJson.data)
          ? membersJson.data
          : Array.isArray(membersJson)
            ? membersJson
            : [];
        const rawLabels = Array.isArray(labelsJson.data)
          ? labelsJson.data
          : Array.isArray(labelsJson)
            ? labelsJson
            : [];

        setProjects(rawProjects);
        setMembers(rawMembers);
        setLabels(rawLabels);
      })
      .catch((error) => {
        console.error("Failed to fetch settings data:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleToggleNotification = () => {
    setNotificationsEnabled(!notificationsEnabled);
    console.log("Notification settings updated:", !notificationsEnabled);
  };

  const handleArchiveProject = (projectId: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status: "archived" } : p))
    );
    console.log("Project archived:", projectId);
  };

  const handleDeactivateMember = (memberId: string) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId ? { ...m, is_active: false } : m
      )
    );
    console.log("Member deactivated:", memberId);
  };

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">設定</h1>
        <p className="text-muted-foreground">管理系統設定</p>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList>
          <TabsTrigger value="personal">個人設定</TabsTrigger>
          <TabsTrigger value="projects">專案管理</TabsTrigger>
          <TabsTrigger value="members">人員管理</TabsTrigger>
          <TabsTrigger value="labels">標籤管理</TabsTrigger>
        </TabsList>

        {/* Personal Settings */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>個人資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>姓名</Label>
                  <Input value="使用者" disabled />
                </div>
                <div>
                  <Label>電子郵件</Label>
                  <Input value="user@example.com" disabled />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notifications"
                    checked={notificationsEnabled}
                    onCheckedChange={() => setNotificationsEnabled(!notificationsEnabled)}
                  />
                  <Label htmlFor="notifications" className="cursor-pointer">
                    啟用電子郵件與系統通知
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Management */}
        <TabsContent value="projects">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>專案列表</CardTitle>
              <Button onClick={() => setAddProjectDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                新增專案
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名稱</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead>顏色</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        暫無專案
                      </TableCell>
                    </TableRow>
                  ) : (
                    projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell>
                          <Badge variant={project.status === "active" ? "default" : "secondary"}>
                            {project.status === "active" ? "進行中" : "已封存"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div
                            className="w-6 h-6 rounded-full border"
                            style={{ backgroundColor: project.color }}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {project.status === "active" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleArchiveProject(project.id)}
                              >
                                <Archive className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Management */}
        <TabsContent value="members">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>成員列表</CardTitle>
              <Button onClick={() => setAddMemberDialogOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                新增成員
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>電子郵件</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        暫無成員
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>
                          <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                            {member.role === "admin" ? "管理員" : "成員"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.is_active ? "done" : "secondary"}>
                            {member.is_active ? "啟用" : "停用"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {member.is_active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeactivateMember(member.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Labels Management */}
        <TabsContent value="labels">
          <Card>
            <CardHeader>
              <CardTitle>標籤列表</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名稱</TableHead>
                    <TableHead>顏色</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        暫無標籤
                      </TableCell>
                    </TableRow>
                  ) : (
                    labels.map((label) => (
                      <TableRow key={label.id}>
                        <TableCell className="font-medium">{label.name}</TableCell>
                        <TableCell>
                          <div
                            className="w-6 h-6 rounded-full border"
                            style={{ backgroundColor: label.color }}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
