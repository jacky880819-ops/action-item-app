// 在 Vercel 上執行的清空腳本
// 訪問：https://action-item-app-amber.vercel.app/admin/reset

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminResetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{success?: boolean; message?: string; error?: string} | null>(null);

  const handleReset = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const res = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "YES_DELETE_ALL_DATA" }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setResult({ success: true, message: "已成功清空所有資料！" });
        setTimeout(() => router.refresh(), 2000);
      } else {
        setResult({ error: data.error || "清空失敗" });
      }
    } catch (error) {
      setResult({ error: "發生錯誤，請稍後再試" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-destructive" />
            清空所有資料
          </CardTitle>
          <CardDescription>
            此操作將刪除所有任務、專案和團隊成員
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>警告</AlertTitle>
            <AlertDescription>
              此操作無法復原！只有您的管理員帳號會被保留。
            </AlertDescription>
          </Alert>
          
          {result && (
            <div className={`mt-4 p-3 rounded ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {result.message || result.error}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()} disabled={loading}>
            取消
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleReset} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "清空中..." : "確認清空所有資料"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
