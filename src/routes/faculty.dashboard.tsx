import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { PortalShell } from "@/components/PortalShell";
import { facultyNav } from "@/components/portal-nav";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, ShoppingCart, Info, BookOpen } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/faculty/dashboard")({
  component: FacultyDashboard,
});

interface Subject {
  subject_code: string;
  course_title: string;
  subject_category: string;
  theory_hours_l: number;
  practical_hours_p: number;
  credits_c: number;
}

interface Constraint {
  subject_category: string;
  max_allowed: number;
}

function FacultyDashboard() {
  const { session } = useAuth();
  const [programType, setProgramType] = useState("UG");
  const [semesterType, setSemesterType] = useState("Odd");

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // The "cart" stores subject codes
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  useEffect(() => {
    async function fetchFormData() {
      setLoading(true);
      try {
        const res = await api.get(`/api/faculty/form-data`, {
          params: { program_type: programType, semester_type: semesterType }
        });
        setSubjects(res.data.subjects || []);
        setConstraints(res.data.constraints || []);
        setSelectedSubjects([]); // Reset cart on workspace change
      } catch (err: any) {
        console.error("Failed to fetch form data:", err);
        toast.error("Failed to fetch curriculum data. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchFormData();
  }, [programType, semesterType]);

  const handleToggleSubject = (code: string) => {
    setSelectedSubjects(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  // Calculate current counts by category
  const currentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    selectedSubjects.forEach(code => {
      const sub = subjects.find(s => s.subject_code === code);
      if (sub) {
        counts[sub.subject_category] = (counts[sub.subject_category] || 0) + 1;
      }
    });
    return counts;
  }, [selectedSubjects, subjects]);

  // Validation
  const constraintViolations = useMemo(() => {
    const violations: string[] = [];
    constraints.forEach(c => {
      const current = currentCounts[c.subject_category] || 0;
      if (current > c.max_allowed) {
        violations.push(`Maximum allowed for ${c.subject_category} is ${c.max_allowed} (You selected ${current}).`);
      }
    });
    return violations;
  }, [constraints, currentCounts]);

  const canSubmit = selectedSubjects.length > 0 && constraintViolations.length === 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await api.post("/api/faculty/submit-cart", {
        program_type: programType,
        semester_type: semesterType,
        preferences: selectedSubjects,
      });
      toast.success("Preferences submitted successfully!");
      setSelectedSubjects([]);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to submit preferences.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalShell
      role="faculty"
      title={`Welcome, ${session?.name || 'Faculty'}`}
      subtitle="Select your preferred subjects for the upcoming academic session."
      nav={facultyNav}
    >
      {/* Workspace Session Controls */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Session Context</h2>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Program:</span>
            <ToggleGroup type="single" value={programType} onValueChange={(v) => v && setProgramType(v)} className="bg-muted p-1 rounded-lg">
              <ToggleGroupItem value="UG" className="rounded-md px-3 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm">UG</ToggleGroupItem>
              <ToggleGroupItem value="PG" className="rounded-md px-3 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm">PG</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Semester:</span>
            <ToggleGroup type="single" value={semesterType} onValueChange={(v) => v && setSemesterType(v)} className="bg-muted p-1 rounded-lg">
              <ToggleGroupItem value="Odd" className="rounded-md px-3 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm">Odd</ToggleGroupItem>
              <ToggleGroupItem value="Even" className="rounded-md px-3 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm">Even</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Pane: Available Curriculum */}
        <div className="w-full lg:flex-1 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="bg-muted/30 p-4 border-b border-border/50 flex items-center gap-2">
            <BookOpen className="size-5 text-primary" />
            <h2 className="font-semibold">Available Curriculum</h2>
          </div>
          
          <div className="p-4">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                <span className="animate-pulse">Loading curriculum data...</span>
              </div>
            ) : subjects.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                <Info className="size-6 mb-2 opacity-50" />
                <p className="text-sm">No subjects found for this session.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {subjects.map((sub) => {
                  const isSelected = selectedSubjects.includes(sub.subject_code);
                  return (
                    <div 
                      key={sub.subject_code} 
                      className={`relative rounded-lg border p-4 transition-all cursor-pointer ${
                        isSelected ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm" : "border-border hover:border-primary/50 hover:bg-muted/30"
                      }`}
                      onClick={() => handleToggleSubject(sub.subject_code)}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="text-xs font-mono text-muted-foreground mb-1">{sub.subject_code}</p>
                          <h3 className="text-sm font-semibold text-foreground leading-tight">{sub.course_title}</h3>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                              {sub.subject_category}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground border border-border/50">
                              L:{sub.theory_hours_l} P:{sub.practical_hours_p} C:{sub.credits_c}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 mt-1">
                          {isSelected ? (
                            <CheckCircle2 className="size-5 text-primary" />
                          ) : (
                            <div className="size-5 rounded-full border-2 border-muted-foreground/30" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Willingness Cart */}
        <div className="w-full lg:w-80 shrink-0 sticky top-6">
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
            <div className="bg-primary/10 p-4 border-b border-primary/20 flex items-center gap-2 text-primary">
              <ShoppingCart className="size-5" />
              <h2 className="font-semibold">Willingness Cart</h2>
              <span className="ml-auto rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
                {selectedSubjects.length}
              </span>
            </div>
            
            <div className="p-4 flex-1 flex flex-col gap-4">
              {/* Selected Items */}
              <div className="min-h-[120px] max-h-[300px] overflow-y-auto pr-1">
                {selectedSubjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center mt-8">Your cart is empty.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedSubjects.map(code => {
                      const sub = subjects.find(s => s.subject_code === code);
                      return (
                        <div key={code} className="flex justify-between items-center rounded-md border bg-muted/20 px-3 py-2">
                          <div>
                            <p className="text-xs font-mono font-medium">{code}</p>
                            <p className="text-xs text-muted-foreground truncate w-40" title={sub?.course_title}>{sub?.course_title}</p>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {sub?.subject_category}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Constraints Info / Violations */}
              <div className="mt-2 border-t pt-4">
                <h3 className="text-xs font-semibold text-foreground uppercase mb-2">Category Rules</h3>
                {constraints.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No limits defined for this session.</p>
                ) : (
                  <ul className="space-y-1">
                    {constraints.map(c => {
                      const current = currentCounts[c.subject_category] || 0;
                      const isOver = current > c.max_allowed;
                      return (
                        <li key={c.subject_category} className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">{c.subject_category}</span>
                          <span className={`font-medium ${isOver ? 'text-destructive' : 'text-foreground'}`}>
                            {current} / {c.max_allowed}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {constraintViolations.length > 0 && (
                <div className="rounded-md bg-destructive/10 p-3 border border-destructive/20 text-destructive text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold mb-1">
                    <AlertCircle className="size-4" /> Limit Exceeded
                  </div>
                  {constraintViolations.map((v, i) => (
                    <p key={i}>• {v}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-muted/10">
              <Button 
                className="w-full" 
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
              >
                {submitting ? "Submitting..." : "Submit Preferences"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
