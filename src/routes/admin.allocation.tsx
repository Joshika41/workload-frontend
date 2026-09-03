import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PortalShell } from "@/components/PortalShell";
import { adminNav } from "@/components/portal-nav";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileDown, ShieldAlert, Save, RefreshCw, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export const Route = createFileRoute("/admin/allocation")({
  component: AdminAllocation,
});

interface AllocationRow {
  id: string; // unique frontend identifier (could be faculty_id+subject_code+cohort_id)
  faculty_id: string;
  faculty_name: string;
  subject_code: string;
  cohort_id: string;
  cohort_name: string;
  role_type: string;
  allocated_theory_hours: number;
  allocated_lab_hours: number;
  // Metadata for limits
  max_theory: number;
  max_lab: number;
}

function AdminAllocation() {
  const [programType, setProgramType] = useState("UG");
  const [semesterType, setSemesterType] = useState("Odd");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [modifiedRows, setModifiedRows] = useState<Set<string>>(new Set());

  // Verification Sheet State
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [unassignedItems, setUnassignedItems] = useState<any[]>([]);

  // Fetch initial matrix (mocking structure based on GET /api/admin/preferences)
  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/preferences`, {
        params: { program_type: programType, semester_type: semesterType }
      });
      
      // Assume the backend returns an array of rows
      const data = res.data.map((item: any) => ({
        id: `${item.faculty_id}-${item.subject_code}-${item.cohort_id}`,
        faculty_id: item.faculty_id,
        faculty_name: item.faculty_name || item.faculty_id,
        subject_code: item.subject_code,
        cohort_id: item.cohort_id,
        cohort_name: item.cohort_name || "N/A",
        role_type: item.role_type || "Main",
        allocated_theory_hours: item.allocated_theory_hours || 0,
        allocated_lab_hours: item.allocated_lab_hours || 0,
        max_theory: item.theory_hours_l || 4,
        max_lab: item.practical_hours_p || 2,
      }));
      setAllocations(data);
      setModifiedRows(new Set());
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to fetch matrix data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, [programType, semesterType]);

  const handleCellChange = (id: string, field: "allocated_theory_hours" | "allocated_lab_hours", value: string) => {
    const numValue = parseInt(value, 10) || 0;
    setAllocations(prev => prev.map(row => {
      if (row.id === id) {
        return { ...row, [field]: numValue };
      }
      return row;
    }));
    setModifiedRows(prev => new Set(prev).add(id));
  };

  const handleSave = async () => {
    const changes = allocations.filter(row => modifiedRows.has(row.id));
    if (changes.length === 0) return;

    setSaving(true);
    try {
      // Endpoint expects array of objects matching schema
      const payload = changes.map(row => ({
        faculty_id: row.faculty_id,
        subject_code: row.subject_code,
        cohort_id: row.cohort_id,
        role_type: row.role_type,
        allocated_theory_hours: row.allocated_theory_hours,
        allocated_lab_hours: row.allocated_lab_hours,
      }));

      await api.post("/api/admin/allocations/assign", { allocations: payload });
      toast.success(`Successfully updated ${changes.length} assignments.`);
      setModifiedRows(new Set());
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Mathematical Guardrail triggered: Over-allocation detected.");
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    setIsVerifyOpen(true);
    setVerifyLoading(true);
    try {
      const res = await api.get(`/api/admin/verify-allocations`, {
        params: { program_type: programType, semester_type: semesterType }
      });
      setUnassignedItems(res.data.unassigned || []);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to run verification sweep");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const toastId = toast.loading("Generating PDF Workload...");
      const res = await api.get(`/api/admin/export-workload`, {
        params: { program_type: programType, semester_type: semesterType },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `workload_${programType}_${semesterType}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      
      toast.success("PDF Downloaded successfully!", { id: toastId });
    } catch (err) {
      toast.error("Failed to generate PDF export.");
    }
  };

  return (
    <PortalShell
      role="admin"
      title="Workload Allocation Matrix"
      subtitle="Granular workload distribution and hour splits"
      nav={adminNav}
      maxWidth="max-w-[1600px]"
    >
      <div className="flex flex-col gap-6 h-full">
        {/* Top Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <ToggleGroup type="single" value={programType} onValueChange={(v) => v && setProgramType(v)} className="bg-muted p-1 rounded-lg">
              <ToggleGroupItem value="UG" className="rounded-md px-3 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm">UG</ToggleGroupItem>
              <ToggleGroupItem value="PG" className="rounded-md px-3 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm">PG</ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup type="single" value={semesterType} onValueChange={(v) => v && setSemesterType(v)} className="bg-muted p-1 rounded-lg">
              <ToggleGroupItem value="Odd" className="rounded-md px-3 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm">Odd</ToggleGroupItem>
              <ToggleGroupItem value="Even" className="rounded-md px-3 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm">Even</ToggleGroupItem>
            </ToggleGroup>
            <Button variant="outline" size="icon" onClick={fetchMatrix} disabled={loading} title="Refresh Matrix">
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={handleVerify} className="gap-2 text-primary bg-primary/10 hover:bg-primary/20">
              <ShieldAlert className="size-4" /> Verify Matrix
            </Button>
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <FileDown className="size-4" /> Export PDF
            </Button>
            <Button onClick={handleSave} disabled={modifiedRows.size === 0 || saving} className="gap-2">
              <Save className="size-4" /> {saving ? "Saving..." : `Commit Changes (${modifiedRows.size})`}
            </Button>
          </div>
        </div>

        {/* Full Bleed Data Grid */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex-1 flex flex-col min-h-[500px]">
          <div className="overflow-x-auto flex-1 relative">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-xs text-muted-foreground bg-muted/30 uppercase sticky top-0 z-10 border-b border-border shadow-sm">
                <tr>
                  <th className="px-4 py-3 font-semibold w-[20%]">Faculty</th>
                  <th className="px-4 py-3 font-semibold w-[20%]">Subject</th>
                  <th className="px-4 py-3 font-semibold w-[15%]">Cohort</th>
                  <th className="px-4 py-3 font-semibold w-[15%]">Role Type</th>
                  <th className="px-4 py-3 font-semibold w-[15%]">Theory Hours</th>
                  <th className="px-4 py-3 font-semibold w-[15%]">Lab Hours</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Loading matrix data...
                    </td>
                  </tr>
                ) : allocations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No allocations or preferences found for this session.
                    </td>
                  </tr>
                ) : (
                  allocations.map((row) => (
                    <tr key={row.id} className={`border-b border-border hover:bg-muted/10 transition-colors ${modifiedRows.has(row.id) ? 'bg-primary/5' : ''}`}>
                      <td className="px-4 py-2 font-medium">{row.faculty_name}</td>
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs block text-muted-foreground">{row.subject_code}</span>
                      </td>
                      <td className="px-4 py-2">{row.cohort_name}</td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                          {row.role_type}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <Input 
                          type="number" 
                          min={0}
                          max={row.max_theory}
                          className="w-20 h-8 font-mono text-center" 
                          value={row.allocated_theory_hours.toString()}
                          onChange={(e) => handleCellChange(row.id, "allocated_theory_hours", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input 
                          type="number" 
                          min={0}
                          max={row.max_lab}
                          className="w-20 h-8 font-mono text-center" 
                          value={row.allocated_lab_hours.toString()}
                          onChange={(e) => handleCellChange(row.id, "allocated_lab_hours", e.target.value)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Verify Matrix Slide-Over */}
      <Sheet open={isVerifyOpen} onOpenChange={setIsVerifyOpen}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2 text-primary">
              <ShieldAlert className="size-5" />
              Verification Sweep
            </SheetTitle>
            <SheetDescription>
              Identifying unassigned curriculum mapping and allocation gaps across the {programType} {semesterType} workspace.
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4">
            {verifyLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <RefreshCw className="size-6 animate-spin" />
              </div>
            ) : unassignedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="size-12 text-green-500 mb-4" />
                <h3 className="font-semibold text-lg text-foreground">100% Verified</h3>
                <p className="text-sm text-muted-foreground mt-1">All cohorts and subjects are fully mapped and allocated.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-destructive uppercase tracking-wider mb-2">Unassigned Items ({unassignedItems.length})</h3>
                {unassignedItems.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-mono text-xs font-semibold">{item.subject_code}</span>
                      <span className="text-xs font-medium text-muted-foreground">{item.cohort_name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Missing {item.missing_hours} hours of {item.missing_type} allocation.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </PortalShell>
  );
}
