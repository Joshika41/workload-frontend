import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, X, Send, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { facultyNav } from "@/components/portal-nav";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/faculty/")({
  head: () => ({
    meta: [
      { title: "Subject Preferences · Faculty · SRM ERP" },
      {
        name: "description",
        content:
          "Select preferred courses from the semester syllabus and submit them for administrative review.",
      },
      { property: "og:title", content: "Subject Preferences · Faculty · SRM ERP" },
      {
        property: "og:description",
        content: "Choose semester courses and submit teaching preferences for admin approval.",
      },
    ],
  }),
  component: PreferenceHub,
});

function PreferenceHub() {
  const { session } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [pick, setPick] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Fetch Syllabus
  const { data: syllabus } = useQuery({
    queryKey: ["syllabus"],
    queryFn: async () => {
      const res = await api.get("/syllabus");
      return res.data;
    }
  });

  const subjects = syllabus ? syllabus.map((s: any) => s.course_title) : [];

  const mutation = useMutation({
    mutationFn: async (subjects: string[]) => {
      await api.post("/faculty/preferences", { subjects });
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Preferences submitted", {
        description: "Awaiting administrative approval.",
      });
    },
    onError: (err: any) => {
      toast.error("Failed to submit", { description: err.message });
    }
  });

  function add() {
    if (!pick || selected.includes(pick)) return;
    setSelected((prev) => [...prev, pick]);
    setPick("");
    setSubmitted(false);
  }

  return (
    <PortalShell
      role="faculty"
      title="Subject Selection & Preference Hub"
      subtitle={`Welcome, ${session?.name ?? "Faculty"} · Odd Semester 2026`}
      nav={facultyNav}
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] lg:col-span-2">
          <h2 className="text-lg font-semibold text-foreground">Choose Your Courses</h2>
          <p className="text-sm text-muted-foreground">
            Pick from the approved syllabus for this semester. Admin will review your submission.
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Available syllabus</Label>
              <Select value={pick} onValueChange={setPick}>
                <SelectTrigger className="w-72">
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.filter((s: string) => !selected.includes(s)).map((s: string) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={add} disabled={!pick}>
              <Plus className="mr-2 size-4" /> Add Preference
            </Button>
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted text-left">
                  {["#", "Subject", "Type", ""].map((h, i) => (
                    <th
                      key={i}
                      className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selected.length === 0 ? (
                  <tr className="border-t border-border">
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                      -
                    </td>
                  </tr>
                ) : (
                  selected.map((s, i) => (
                    <tr key={s} className="border-t border-border">
                      <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-foreground">{s}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary">{s.includes("LAB") ? "Practical" : "Theory"}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => {
                            setSelected((prev) => prev.filter((p) => p !== s));
                            setSubmitted(false);
                          }}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${s}`}
                        >
                          <X className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Button
            className="mt-5"
            size="lg"
            disabled={selected.length === 0 || submitted || mutation.isPending}
            onClick={() => mutation.mutate(selected)}
          >
            <Send className="mr-2 size-4" /> 
            {mutation.isPending ? "Submitting..." : "Submit Preferences for Admin Review"}
          </Button>
        </section>

        <aside className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Submission Status
            </h3>
            <div className="mt-3">
              {submitted ? (
                <Badge variant="secondary" className="text-sm">
                  <Clock className="mr-1.5 size-3.5" /> Pending Approval
                </Badge>
              ) : (
                <Badge variant="outline" className="text-sm">
                  Draft — not submitted
                </Badge>
              )}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {submitted
                ? "Your selections are locked until the admin reviews them."
                : "Add subjects and submit before the departmental deadline."}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Load Summary
            </h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Theory subjects</dt>
                <dd className="font-medium">{selected.filter((s) => !s.includes("LAB")).length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Practical subjects</dt>
                <dd className="font-medium">{selected.filter((s) => s.includes("LAB")).length}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="text-muted-foreground">Estimated hours</dt>
                <dd className="font-semibold">
                  {selected.reduce((a, s) => a + (s.includes("LAB") ? 4 : 3), 0)} / 18
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-accent/40 p-5">
            <CheckCircle2 className="mb-2 size-5 text-primary" />
            <p className="text-sm text-foreground">
              Preferences approved by admin are automatically fed into the workload matrix and
              timetable generator.
            </p>
          </div>
        </aside>
      </div>
    </PortalShell>
  );
}
