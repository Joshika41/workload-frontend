import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Building2, ArrowRight, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Select Department · Admin · SRM ERP" },
      {
        name: "description",
        content: "Choose the academic department to manage timetables, faculty workload and scheduling.",
      },
      { property: "og:title", content: "Select Department · Admin · SRM ERP" },
      {
        property: "og:description",
        content: "Choose the academic department to manage timetables and faculty workload.",
      },
    ],
  }),
  component: DepartmentGateway,
});

function DepartmentGateway() {
  const { session, ready, setDepartment, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: metadata } = useQuery({
    queryKey: ["metadata"],
    queryFn: async () => {
      const res = await api.get("/timetable/metadata");
      return res.data;
    }
  });

  const departments = metadata?.departments || ["MCA"];

  useEffect(() => {
    if (ready && (!session || session.role !== "admin")) navigate({ to: "/", replace: true });
  }, [ready, session, navigate]);

  if (!ready || !session || session.role !== "admin") return null;

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{ background: "var(--gradient-institutional)" }}
    >
      <div className="w-full max-w-3xl rounded-xl bg-card p-8 shadow-[var(--shadow-card)]">
        <div className="mb-6">
          <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Building2 className="size-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Select a Department</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Signed in as {session.name}. Choose the department workspace you want to administer.
          </p>
        </div>

        <ul className="space-y-3">
          {departments.map((dept: string) => (
            <li key={dept}>
              <button
                onClick={() => {
                  setDepartment(dept);
                  navigate({ to: "/admin/workload" });
                }}
                className="flex w-full items-center justify-between gap-4 rounded-lg border border-border bg-background px-4 py-4 text-left transition-colors hover:border-ring hover:bg-accent/40"
              >
                <span className="text-sm font-medium text-foreground">{dept}</span>
                <ArrowRight className="size-4 shrink-0 text-primary" />
              </button>
            </li>
          ))}
        </ul>

        <Button
          variant="ghost"
          className="mt-6"
          onClick={() => {
            signOut();
            navigate({ to: "/", replace: true });
          }}
        >
          <LogOut className="mr-2 size-4" /> Sign Out
        </Button>
      </div>
    </div>
  );
}
