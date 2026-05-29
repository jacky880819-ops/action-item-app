"use client";

import { useEffect, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface WeeklyReport {
  week: string;
  new_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
}

interface MonthlyReport {
  member_name: string;
  tasks_completed: number;
  tasks_assigned: number;
  completion_rate: number;
  avg_completion_days: number;
}

interface Project {
  id: string;
  name: string;
}

export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [weeklyData, setWeeklyData] = useState<WeeklyReport[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then((res) => res.json()),
      fetch("/api/reports/weekly").then((res) => res.json()),
      fetch("/api/reports/monthly").then((res) => res.json()),
    ])
      .then(([projectsJson, weeklyJson, monthlyJson]) => {
        // Safely coerce API responses
        const rawProjects = Array.isArray(projectsJson.data) ? projectsJson.data : Array.isArray(projectsJson) ? projectsJson : [];
        const projectsData: Project[] = rawProjects.map((p: Record<string, unknown>) => ({
          id: p.id,
          name: p.name,
        }));
        setProjects(projectsData);

        // Weekly API returns { data: { period, newTasksCount, completedTasksCount, overdueTasksCount } }
        const weeklyRaw = weeklyJson.data || weeklyJson;
        setWeeklyData([{
          week: weeklyRaw.period ? `${weeklyRaw.period.start} ~ ${weeklyRaw.period.end}` : "本週",
          new_tasks: weeklyRaw.newTasksCount || 0,
          completed_tasks: weeklyRaw.completedTasksCount || 0,
          overdue_tasks: weeklyRaw.overdueTasksCount || 0,
        }]);

        // Monthly API returns { data: { period, memberStats, projectStats } }
        const monthlyRaw = monthlyJson.data || monthlyJson;
        const memberStats = monthlyRaw.memberStats || [];
        setMonthlyData(memberStats.map((m: Record<string, number | string>) => ({
          member_name: (m.userName as string) || (m.member_name as string) || "未知",
          tasks_completed: (m.tasksCompleted as number) || (m.tasks_completed as number) || 0,
          tasks_assigned: (m.tasksCreated as number) || (m.tasks_assigned as number) || 0,
          completion_rate: (m.tasksCreated as number) > 0 ? (((m.tasksCompleted as number) || 0) / (m.tasksCreated as number)) * 100 : 0,
          avg_completion_days: 0,
        })));
      })
      .catch((error) => {
        console.error("Failed to fetch reports:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleExport = (type: "weekly" | "monthly") => {
    console.log("Export functionality coming soon:", type);
    alert("即將推出：匯出功能開發中，敬請期待");
  };

  if (loading) {
    return (
      <div className="flex-1 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-80 bg-muted rounded"></div>
            <div className="h-80 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">報表</h1>
          <p className="text-muted-foreground">查看團隊績效與進度報告</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
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

          <Button variant="outline" onClick={() => handleExport("weekly")}>
            <Download className="w-4 h-4 mr-2" />
            匯出週報
          </Button>
          <Button variant="outline" onClick={() => handleExport("monthly")}>
            <Download className="w-4 h-4 mr-2" />
            匯出月報
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Weekly Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              週報統計
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="new_tasks" name="新增任務" fill="#3B82F6" />
                <Bar dataKey="completed_tasks" name="完成任務" fill="#27ae60" />
                <Bar dataKey="overdue_tasks" name="逾期任務" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              月報統計
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>成員</TableHead>
                  <TableHead className="text-right">分配任務</TableHead>
                  <TableHead className="text-right">完成任務</TableHead>
                  <TableHead className="text-right">完成率</TableHead>
                  <TableHead className="text-right">平均完成天數</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      暫無資料
                    </TableCell>
                  </TableRow>
                ) : (
                  monthlyData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.member_name}</TableCell>
                      <TableCell className="text-right">{row.tasks_assigned}</TableCell>
                      <TableCell className="text-right">{row.tasks_completed}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            row.completion_rate >= 80
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : row.completion_rate >= 50
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }`}
                        >
                          {row.completion_rate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {row.avg_completion_days.toFixed(1)} 天
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
