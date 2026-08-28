import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import { adminNav } from "@/components/portal-nav";

export const Route = createFileRoute("/admin/")({
  component: AdminDataTime,
});

function AdminDataTime() {
  const { session } = useAuth();
  
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null);
  const [facultyFile, setFacultyFile] = useState<File | null>(null);
  const [roomsFile, setRoomsFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!syllabusFile && !facultyFile && !roomsFile) {
      toast.error("Please select at least one file to upload");
      return;
    }
    
    setUploading(true);
    let successCount = 0;
    
    try {
      if (syllabusFile) {
        const formData = new FormData();
        formData.append("file", syllabusFile);
        await api.post("/api/upload/syllabus", formData, { headers: { "Content-Type": "multipart/form-data" } });
        successCount++;
        setSyllabusFile(null);
      }
      if (facultyFile) {
        const formData = new FormData();
        formData.append("file", facultyFile);
        await api.post("/api/upload/faculty_list", formData, { headers: { "Content-Type": "multipart/form-data" } });
        successCount++;
        setFacultyFile(null);
      }
      if (roomsFile) {
        const formData = new FormData();
        formData.append("file", roomsFile);
        await api.post("/api/upload/rooms", formData, { headers: { "Content-Type": "multipart/form-data" } });
        successCount++;
        setRoomsFile(null);
      }
      
      toast.success(`Successfully uploaded ${successCount} file(s)!`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <PortalShell
      role="admin"
      title="Data & Time Configuration"
      subtitle="Upload ERP metadata and configure time slots"
      nav={adminNav || []}
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Data Upload Panel */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Metadata Ingestion</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Syllabus Excel File</label>
              <input type="file" accept=".xlsx, .xls" onChange={e => setSyllabusFile(e.target.files?.[0] || null)} className="w-full rounded border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Faculty Excel File</label>
              <input type="file" accept=".xlsx, .xls" onChange={e => setFacultyFile(e.target.files?.[0] || null)} className="w-full rounded border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rooms Excel File</label>
              <input type="file" accept=".xlsx, .xls" onChange={e => setRoomsFile(e.target.files?.[0] || null)} className="w-full rounded border px-3 py-2 text-sm" />
            </div>
            <Button onClick={handleUpload} disabled={uploading} className="w-full mt-4">
              {uploading ? "Uploading..." : "Upload & Sync Database"}
            </Button>
          </div>
        </div>

        {/* Time Settings Grid */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Time Grid Settings</h2>
          <p className="text-sm text-muted-foreground mb-4">Define university periods and break intervals.</p>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map(period => (
              <div key={period} className="flex items-center gap-4">
                <span className="w-16 font-medium text-sm">Period {period}</span>
                <input type="time" className="rounded border border-border bg-background px-2 py-1 text-sm" defaultValue={`0${8+period}:00`} />
                <span>to</span>
                <input type="time" className="rounded border border-border bg-background px-2 py-1 text-sm" defaultValue={`0${9+period}:00`} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded border-border" /> Break
                </label>
              </div>
            ))}
            <Button className="w-full mt-4" variant="secondary">Save Time Configuration</Button>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
