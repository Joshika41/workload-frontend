import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { PortalShell } from "@/components/PortalShell";
import { adminNav } from "@/components/portal-nav";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Users, BookOpen, Layers, Database } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const Route = createFileRoute("/admin/setup")({
  component: AdminSetup,
});

function DropzoneCard({ title, icon: Icon, description, endpoint, workspaceSession }: { title: string, icon: any, description: string, endpoint: string, workspaceSession: { programType: string, semesterType: string } }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"]
    },
    maxFiles: 1
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("program_type", workspaceSession.programType);
    formData.append("semester_type", workspaceSession.semesterType);

    try {
      const res = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success(res.data.message || `Successfully uploaded ${title}`);
      setFile(null);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || `Failed to upload ${title}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-[var(--shadow-card)]">
      <div className="p-6 pb-4 flex items-center gap-3 border-b border-border/50 bg-muted/20">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <h3 className="font-semibold tracking-tight text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="p-6">
        <div
          {...getRootProps()}
          className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className={`mb-3 size-8 transition-colors ${isDragActive ? "text-primary" : "text-muted-foreground group-hover:text-primary/70"}`} />
          {file ? (
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Click or drag file here</p>
              <p className="mt-1 text-xs text-muted-foreground">.xlsx or .xls up to 10MB</p>
            </div>
          )}
        </div>
        
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="mt-6 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          {uploading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"></div>
              Processing...
            </span>
          ) : (
            "Upload and Sync"
          )}
        </button>
      </div>
    </div>
  );
}

function AdminSetup() {
  const [programType, setProgramType] = useState("UG");
  const [semesterType, setSemesterType] = useState("Odd");

  return (
    <PortalShell
      role="admin"
      title="Setup & Ingestion"
      subtitle="Initialize your workspace and import ERP metadata"
      nav={adminNav}
    >
      <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Workspace Session</h2>
        <div className="flex flex-wrap items-center gap-6">
          <div className="space-y-2">
            <span className="text-sm font-medium">Program Type</span>
            <ToggleGroup type="single" value={programType} onValueChange={(v) => v && setProgramType(v)} className="justify-start bg-muted p-1 rounded-lg">
              <ToggleGroupItem value="UG" className="rounded-md px-4 text-sm data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm">Undergraduate (UG)</ToggleGroupItem>
              <ToggleGroupItem value="PG" className="rounded-md px-4 text-sm data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm">Postgraduate (PG)</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">Semester Type</span>
            <ToggleGroup type="single" value={semesterType} onValueChange={(v) => v && setSemesterType(v)} className="justify-start bg-muted p-1 rounded-lg">
              <ToggleGroupItem value="Odd" className="rounded-md px-4 text-sm data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm">Odd Semester</ToggleGroupItem>
              <ToggleGroupItem value="Even" className="rounded-md px-4 text-sm data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm">Even Semester</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <DropzoneCard 
          title="Faculty Roster" 
          description="Import faculty details and dispatch secure credentials."
          icon={Users}
          endpoint="/api/admin/upload-faculty"
          workspaceSession={{ programType, semesterType }}
        />
        <DropzoneCard 
          title="Syllabus Curriculum" 
          description="Import static subjects, L-T-P limits, and categories."
          icon={BookOpen}
          endpoint="/api/admin/upload-syllabus"
          workspaceSession={{ programType, semesterType }}
        />
        <DropzoneCard 
          title="Student Cohorts" 
          description="Define active classes and sections for this term."
          icon={Layers}
          endpoint="/api/admin/upload-cohorts"
          workspaceSession={{ programType, semesterType }}
        />
      </div>
    </PortalShell>
  );
}
