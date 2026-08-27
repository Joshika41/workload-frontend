import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, ShieldCheck, BookOpen, Landmark, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/erp-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign In · SRM Timetable & Workload ERP" },
      {
        name: "description",
        content:
          "Select your role — Admin, Faculty or Dean — to sign in to the SRM University timetable and workload management system.",
      },
      { property: "og:title", content: "Sign In · SRM Timetable & Workload ERP" },
      {
        property: "og:description",
        content: "Role based access to university timetable scheduling and faculty workload management.",
      },
    ],
  }),
  component: RoleSelection,
});

const ROLES: { role: Role; title: string; blurb: string; icon: typeof ShieldCheck; hint: string }[] = [
  {
    role: "admin",
    title: "Admin",
    blurb: "Upload syllabi, configure faculty workload, generate and publish master timetables.",
    icon: ShieldCheck,
    hint: "admin / password123",
  },
  {
    role: "faculty",
    title: "Faculty",
    blurb: "Submit subject preferences and review your personal teaching schedule.",
    icon: BookOpen,
    hint: "drpriya / password123",
  },
  {
    role: "dean",
    title: "Dean",
    blurb: "Institution-wide oversight of workload distribution, conflicts and timetables.",
    icon: Landmark,
    hint: "dean / password123",
  },
];

const HOME: Record<Role, string> = {
  admin: "/admin",
  faculty: "/faculty",
  dean: "/dean",
};

function RoleSelection() {
  const { session, ready, signIn } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState<Role | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && session) navigate({ to: HOME[session.role], replace: true });
  }, [ready, session, navigate]);

  function openRole(role: Role) {
    setActive(role);
    setError(null);
    setUsername("");
    setPassword("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!active) return;
    const result = await signIn(username, password, active);
    if (!result.ok) {
      setError(result.error ?? "Sign in failed.");
      return;
    }
    navigate({ to: HOME[active], replace: true });
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{ background: "var(--gradient-institutional)" }}
    >
      <header className="mb-10 max-w-2xl text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-xl bg-primary-foreground/10 text-primary-foreground ring-1 ring-primary-foreground/20">
          <GraduationCap className="size-7" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
          Timetable &amp; Workload Management
        </h1>
        <p className="mt-3 text-sm text-primary-foreground/70 sm:text-base">
          SRM University · Office of Academic Scheduling. Choose your role to continue.
        </p>
      </header>

      <div className="grid w-full max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ROLES.map(({ role, title, blurb, icon: Icon, hint }) => (
          <button
            key={role}
            onClick={() => openRole(role)}
            className="group rounded-xl bg-card p-6 text-left shadow-[var(--shadow-card)] ring-1 ring-border transition-all hover:-translate-y-1 hover:ring-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon className="size-5" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{blurb}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              <LogIn className="size-4" /> Sign in as {title}
            </span>
            <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
              Demo: {hint}
            </p>
          </button>
        ))}
      </div>

      <Dialog open={active !== null} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">{active} Portal Sign In</DialogTitle>
            <DialogDescription>
              Enter your institutional credentials to access the {active} workspace.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                autoComplete="username"
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. drpriya"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            ) : null}
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <p className="mt-10 text-xs text-primary-foreground/50">
        © {new Date().getFullYear()} SRM University · Academic ERP
      </p>
    </div>
  );
}
