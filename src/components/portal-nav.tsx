import { CalendarDays, LayoutGrid, Users, ListChecks, CalendarRange, Building2 } from "lucide-react";
import type { NavItem } from "@/components/PortalShell";

export const adminNav: NavItem[] = [
  { to: "/admin/workload", label: "Workload History & Generation", icon: <LayoutGrid className="size-4" /> },
  { to: "/admin/timetables", label: "Master Class Timetables", icon: <CalendarDays className="size-4" /> },
  { to: "/admin/faculty", label: "Faculty Management", icon: <Users className="size-4" /> },
  { to: "/admin", label: "Change Department", icon: <Building2 className="size-4" /> },
];

export const facultyNav: NavItem[] = [
  { to: "/faculty", label: "Subject Preferences", icon: <ListChecks className="size-4" /> },
  { to: "/faculty/timetable", label: "My Timetable", icon: <CalendarRange className="size-4" /> },
];

export const deanNav: NavItem[] = [
  { to: "/dean", label: "Institutional Oversight", icon: <LayoutGrid className="size-4" /> },
  { to: "/dean/timetables", label: "Universal Timetables", icon: <CalendarDays className="size-4" /> },
];
