"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  BookOpen,
  Clock,
  Menu,
  X,
  Dumbbell,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/alumnos", icon: Users, label: "Alumnos" },
  { href: "/admin/horarios", icon: Clock, label: "Horarios" },
  { href: "/admin/reservas", icon: Calendar, label: "Reservas" },
  { href: "/admin/pagos", icon: CreditCard, label: "Pagos" },
];

function NavItem({ href, icon: Icon, label, onClick }: {
  href: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
        active
          ? "bg-brand-600 text-white shadow-sm"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      )}
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 rounded-xl bg-white p-2.5 shadow-md border border-gray-100 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full w-64 flex-col bg-white border-r border-gray-100 shadow-sm transition-transform duration-200 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
            <Dumbbell size={22} className="text-white" />
          </div>
          <div>
            <p className="text-base font-bold text-gray-900">RYM Pilates</p>
            <p className="text-xs text-gray-500">Panel de gestión</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              onClick={() => setMobileOpen(false)}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">© 2024 RYM Pilates</p>
        </div>
      </aside>
    </>
  );
}
