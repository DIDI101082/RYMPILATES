import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white p-5 shadow-sm border border-gray-100",
        onClick && "cursor-pointer hover:shadow-md transition-shadow",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "default" | "danger" | "warning" | "success";
  subtitle?: string;
}

const statColors = {
  default: "bg-brand-50 text-brand-600",
  danger: "bg-red-50 text-red-600",
  warning: "bg-yellow-50 text-yellow-600",
  success: "bg-green-50 text-green-600",
};

export function StatCard({ title, value, icon, color = "default", subtitle }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div className={cn("rounded-xl p-3", statColors[color])}>{icon}</div>
      </div>
    </Card>
  );
}
