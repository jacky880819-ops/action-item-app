"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutGrid,
  LayoutDashboard,
  ListTodo,
  Kanban,
  FolderKanban,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";

const navItems = [
  { name: "儀表板", href: "/dashboard", icon: LayoutDashboard },
  { name: "任務", href: "/tasks", icon: ListTodo },
  { name: "看板", href: "/tasks/board", icon: Kanban },
  { name: "專案", href: "/projects", icon: FolderKanban },
  { name: "團隊", href: "/team", icon: Users },
  { name: "報表", href: "/reports", icon: BarChart3 },
  { name: "設定", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const userName = session?.user?.name ?? "使用者";
  const userRole = (session?.user as { role?: string })?.role ?? "member";
  const roleDisplay = userRole === "admin" ? "管理員" : userRole === "member" ? "成員" : "訪客";

  return (
    <aside
      className={`sidebar fixed left-0 top-0 h-full transition-all duration-300 ease-in-out ${
        collapsed ? "w-[64px]" : "w-[240px]"
      }`}
    >
      {/* Logo area */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <LayoutGrid className="w-8 h-8 text-blue-400 flex-shrink-0" />
        {!collapsed && (
          <span className="text-lg font-semibold text-white whitespace-nowrap">
            Action Item
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`sidebar-nav-item ${isActive ? "active" : ""} ${
                collapsed ? "justify-center px-2" : ""
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-white/10 px-3 py-4">
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium flex-shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-xs text-slate-400">{roleDisplay}</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-3 w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
            登出
          </button>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
}
