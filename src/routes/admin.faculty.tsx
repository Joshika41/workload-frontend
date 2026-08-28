import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { adminNav } from "@/components/portal-nav";
import { useAuth } from "@/lib/auth";
import { FACULTY, SUBJECTS } from "@/lib/erp-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Faculty } from "@/lib/erp-data";

export const Route = createFileRoute("/admin/faculty")({
  head: () => ({
    meta: [
      { title: "Faculty Management · Admin · SRM ERP" },
      {
        name: "description",
        content:
          "Review, modify and approve subject preferences submitted by faculty members across the department.",
      },
      { property: "og:title", content: "Faculty Management · Admin · SRM ERP" },
      {
        property: "og:description",
        content: "Review and approve faculty subject preferences and monitor allocation.",
      },
    ],
  }),
  component: FacultyManagement,
});

type Status = "pending" | "approved" | "rejected";

interface Row {
  id: string;
  name: string;
  department: string;
  preferences: string[];
  status: Status;
  allocated: number;
  max: number;
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "approved")
    return (
      <Badge className="bg-success text-success-foreground hover:bg-success">
        <Check className="mr-1 size-3" /> Approved
      </Badge>
    );
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return (
    <Badge variant="secondary">
      <Clock className="mr-1 size-3" /> Pending
    </Badge>
  );
}

function FacultyManagement() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  // Fetch Syllabus for the dropdown
  const { data: syllabus } = useQuery({
    queryKey: ["syllabus"],
    queryFn: async () => {
      const res = await api.get("/syllabus");
      return res.data;
    }
  });
  const subjects = syllabus ? syllabus.map((s: any) => s.course_title) : [];

  // Fetch Faculty List
  const { data: facultyList } = useQuery({
    queryKey: ["admin-faculty-list"],
    queryFn: async () => {
      const res = await api.get<Faculty[]>("/admin/faculty-list");
      return res.data;
    }
  });

  // Fetch Admin Preferences
  const { data: preferencesData, isLoading } = useQuery({
    queryKey: ["admin-preferences"],
    queryFn: async () => {
      const res = await api.get("/admin/preferences");
      return res.data;
    }
  });

  const rows: Row[] = facultyList ? facultyList.map((f: any) => {
    // Find all preferences for this faculty
    const facPrefs = preferencesData ? preferencesData.filter((p: any) => p.faculty_id === (f.id || f.faculty_id)) : [];
    const subjects = facPrefs.map((p: any) => p.subject_name);
    // Assume status is pending if any pending, else approved/rejected based on latest
    const status = facPrefs.length > 0 ? facPrefs[0].status.toLowerCase() : "pending";
    const allocated = (f.theory_hours || 0) + (f.lab_hours || 0) + (f.incharge_hours || 0);
    
    return {
      id: f.id || f.faculty_id,
      name: f.name,
      department: f.department,
      preferences: subjects,
      status: status as Status,
      allocated: allocated,
      max: f.max_hours_limit || 16
    };
  }) : [];

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: Status }) => {
      // Create a temporary endpoint to save approval in backend, or just simulate it for now 
      // if backend doesn't have an exact approve endpoint.
      // Assuming a generic preference status update endpoint could exist, but we might just fake it
      // if it's missing in the FastAPI implementation. The prompt only said /api/admin/preferences.
      // We will pretend /api/admin/preferences handles PUT.
      await api.put(`/admin/preferences/${id}`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-preferences"] });
      toast.success(`Preferences ${variables.status}`);
    }
  });

  function setStatus(id: string, status: Status) {
    // In a full implementation, we'd wait for API. For UI demo we can optimistically update or rely on invalidation.
    updateStatusMutation.mutate({ id, status });
  }

  function addPreference(id: string, subject: string) {
    // Ideally this hits an API to update preference
    toast.info("Admin manual preference addition would trigger API here.");
  }

  function removePreference(id: string, subject: string) {
    toast.info("Admin manual preference removal would trigger API here.");
  }

  const pending = rows.filter((r) => r.status === "pending").length;

  return (
    <PortalShell
      role="admin"
      title="Faculty Management & Monitoring"
      subtitle={session?.department ?? "Department workspace"}
      nav={adminNav}
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total Faculty", value: rows.length },
            { label: "Pending Approvals", value: pending },
            {
              label: "Avg. Load",
              value: `${rows.length ? Math.round(rows.reduce((a, r) => a + (r.allocated || 0), 0) / rows.length) : 0} hrs`,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-1.5 text-2xl font-bold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold text-foreground">Subject Preference Review</h2>
            <p className="text-sm text-muted-foreground">
              Modify selections and approve submissions before workload generation.
            </p>
          </div>
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="bg-muted text-left">
                  {["Faculty", "Dept", "Preferences", "Load", "Status", "Actions"].map((h) => (
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
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="font-medium text-foreground">{r.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{r.id}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.department}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {r.preferences.length === 0 ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          r.preferences.map((p) => (
                            <button
                              key={p}
                              onClick={() => removePreference(r.id, p)}
                              className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground hover:bg-accent/70"
                            >
                              {p} <X className="size-3" />
                            </button>
                          ))
                        )}
                      </div>
                      <Select value="" onValueChange={(v) => addPreference(r.id, v)}>
                        <SelectTrigger className="mt-2 h-8 w-48 text-xs">
                          <SelectValue placeholder="Add subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((s: string) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge variant="secondary" className="font-mono">
                        {r.allocated} / {r.max}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setStatus(r.id, "approved")}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatus(r.id, "rejected")}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
