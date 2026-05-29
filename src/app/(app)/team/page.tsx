"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Member {
  id: string;
  name: string;
  role: string;
  active_tasks_count: number;
  overdue_count: number;
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/members").then((res) => res.json()),
      fetch("/api/tasks").then((res) => res.json()),
    ])
      .then(([membersJson, tasksJson]) => {
        // Safely coerce API responses to arrays
        const membersData = Array.isArray(membersJson.data) ? membersJson.data : Array.isArray(membersJson) ? membersJson : [];
        const tasksData = Array.isArray(tasksJson.data) ? tasksJson.data : Array.isArray(tasksJson) ? tasksJson : [];

        // Compute workload per member
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
          role: m.role,
          active_tasks_count: memberMap[m.id]?.active || 0,
          overdue_count: memberMap[m.id]?.overdue || 0,
        }));

        setMembers(enriched);
      })
      .catch((error) => {
        console.error("Failed to fetch team members:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">團隊成員</h1>
        <p className="text-muted-foreground">查看團隊成員與工作負載</p>
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
              <div className="flex items-center gap-4 mb-4">
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
          <p className="text-muted-foreground">暫無團隊成員</p>
        </div>
      )}
    </div>
  );
}
