import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Users, CalendarCheck, Building2 } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { deanNav } from "@/components/portal-nav";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export const Route = createFileRoute("/dean/")({
  head: () => ({
    meta: [
      { title: "Institutional Oversight · Dean · SRM ERP" },
      {
        name: "description",
        content:
          "Monitor department-wide faculty workload distribution, resource conflicts and scheduling health across the institution.",
      },
      { property: "og:title", content: "Institutional Oversight · Dean · SRM ERP" },
      {
        property: "og:description",
        content: "Department-wide workload distribution and resource conflict monitoring.",
      },
    ],
  }),
  component: DeanDashboard,
});

const CONFLICTS = [
  { severity: "high", text: "Lab 2 requested twice on Wednesday P4 — MCA II-A and MCA Gen AI B" },
  { severity: "medium", text: "Dr. Vignesh Balaji projected at 20/20 hours — no buffer capacity" },
  { severity: "low", text: "Seminar Hall unused Monday to Wednesday afternoons" },
];

function DeanDashboard() {
  const { data: facultyData } = useQuery({
    queryKey: ["faculty-list"],
    queryFn: async () => {
      const res = await api.get("/admin/faculty-list");
      return res.data;
    }
  });

  const { data: metadata } = useQuery({
    queryKey: ["metadata"],
    queryFn: async () => {
      const res = await api.get("/timetable/metadata");
      return res.data;
    }
  });

  const faculty = facultyData || [];
  const departments = metadata?.departments || [];
  const sections = metadata?.sections || [];

  const totalAllocated = faculty.reduce(
    (a: number, f: any) => a + (f.theory_hours || 0) + (f.lab_hours || 0) + (f.incharge_hours || 0),
    0,
  );
  const totalCapacity = faculty.reduce((a: number, f: any) => a + (f.max_hours_limit || 0), 0);

  return (
    <PortalShell
      role="dean"
      title="Institutional Oversight"
      subtitle="Read-only view across all departments and sections"
      nav={deanNav}
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Departments", value: departments.length, icon: Building2 },
            { label: "Faculty Members", value: faculty.length, icon: Users },
            { label: "Active Sections", value: sections.length, icon: CalendarCheck },
            { label: "Open Conflicts", value: CONFLICTS.length, icon: AlertTriangle },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <Icon className="size-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <section className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)] lg:col-span-2">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold text-foreground">Workload Distribution</h2>
              <p className="text-sm text-muted-foreground">
                Institution utilisation: {totalAllocated} of {totalCapacity} sanctioned hours
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="bg-muted text-left">
                    {["Faculty", "Department", "Theory", "Practical", "Utilisation"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {faculty.map((f: any) => {
                    const used = (f.theory_hours || 0) + (f.lab_hours || 0) + (f.incharge_hours || 0);
                    const pct = f.max_hours_limit ? Math.round((used / f.max_hours_limit) * 100) : 0;
                    return (
                      <tr key={f.faculty_id} className="border-t border-border">
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                          {f.name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{f.department}</td>
                        <td className="px-4 py-3 text-muted-foreground">{f.theory_hours || "-"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{f.lab_hours || "-"}</td>
                        <td className="min-w-44 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-2" />
                            <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                              {used} / {f.max_hours_limit}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-lg font-semibold text-foreground">Resource Conflicts</h2>
            <ul className="mt-4 space-y-3">
              {CONFLICTS.map((c) => (
                <li key={c.text} className="rounded-lg border border-border bg-background p-3">
                  <Badge
                    variant={c.severity === "high" ? "destructive" : "secondary"}
                    className="mb-2 capitalize"
                  >
                    {c.severity}
                  </Badge>
                  <p className="text-sm text-foreground">{c.text}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Dean accounts are read-only. Contact the scheduling admin to resolve conflicts.
            </p>
          </section>
        </div>
      </div>
    </PortalShell>
  );
}
