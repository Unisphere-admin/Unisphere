"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Upload, Trash2, Loader2, Search, FileText, FolderOpen,
  X, Check, AlertCircle, Download, Users, ChevronRight,
  ChevronDown, ArrowLeft, RefreshCw, Eye,
} from "lucide-react";

interface StorageFile {
  id: string | null;
  name: string;
  metadata?: { size?: number; mimetype?: string };
  created_at?: string;
  updated_at?: string;
}

interface Lead {
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  downloaded_at: string;
}

interface DownloadInfo {
  count: number;
  leads: Lead[];
}

function formatSize(bytes?: number) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d?: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function isFolder(f: StorageFile) {
  if (f.id && f.id.endsWith("/")) return true;
  if (f.id === null && f.name && !/\.[a-zA-Z0-9]+$/.test(f.name)) return true;
  return false;
}

export default function AdminResourcesPage() {
  const [files, setFiles]             = useState<StorageFile[]>([]);
  const [downloadMap, setDownloadMap] = useState<Record<string, DownloadInfo>>({});
  const [loading, setLoading]         = useState(true);
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [deletingPath, setDeletingPath]   = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [currentPath, setCurrentPath] = useState("");
  const [pathStack, setPathStack]     = useState<string[]>([]);
  const [expandedLeads, setExpandedLeads] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async (path = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/resources?path=${encodeURIComponent(path)}`, { credentials: "include" });
      const data = await res.json();
      setFiles(data.files || []);
      setDownloadMap(data.downloadMap || {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFiles(currentPath); }, [fetchFiles, currentPath]);

  const navigateInto = (folderName: string) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setPathStack(prev => [...prev, currentPath]);
    setCurrentPath(newPath);
    setSearch("");
  };

  const navigateBack = () => {
    const prev = pathStack[pathStack.length - 1] ?? "";
    setPathStack(p => p.slice(0, -1));
    setCurrentPath(prev);
    setSearch("");
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setUploadError("");
    setUploadSuccess("");
    const supabase = createClient();
    const errors: string[] = [];
    let successCount = 0;

    for (const file of Array.from(fileList)) {
      const uploadPath = currentPath ? `${currentPath}/${file.name}` : file.name;
      const { error } = await supabase.storage.from("resources").upload(uploadPath, file, { upsert: true });
      if (error) errors.push(`${file.name}: ${error.message}`);
      else successCount++;
    }

    setUploading(false);
    if (errors.length > 0) setUploadError(errors.join("\n"));
    if (successCount > 0) {
      setUploadSuccess(`${successCount} file${successCount > 1 ? "s" : ""} uploaded successfully.`);
      fetchFiles(currentPath);
      setTimeout(() => setUploadSuccess(""), 4000);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (fileName: string) => {
    const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
    const res = await fetch(`/api/admin/resources?path=${encodeURIComponent(filePath)}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      setDeletingPath(null);
      fetchFiles(currentPath);
    }
  };

  const folders = files.filter(f => isFolder(f));
  const actualFiles = files.filter(f => !isFolder(f));

  const filteredFiles = actualFiles.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalDownloads = Object.values(downloadMap).reduce((sum, d) => sum + d.count, 0);
  const uniqueLeads = new Set(
    Object.values(downloadMap).flatMap(d => d.leads.map(l => l.user_email).filter(Boolean))
  ).size;

  const breadcrumbs = currentPath.split("/").filter(Boolean);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Essays & Resources</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload and manage files in the student resources library. Track who downloads what.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchFiles(currentPath)}
            className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-sm">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload Files
          </button>
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp"
            className="hidden" onChange={e => handleUpload(e.target.files)} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Files</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{actualFiles.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Downloads</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{totalDownloads}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Unique Leads</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{uniqueLeads}</p>
        </div>
      </div>

      {/* Upload feedback */}
      {uploadError && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg mb-4 border border-red-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <pre className="whitespace-pre-wrap font-sans">{uploadError}</pre>
          <button onClick={() => setUploadError("")} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}
      {uploadSuccess && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-3 rounded-lg mb-4 border border-green-200">
          <Check className="h-4 w-4" /> {uploadSuccess}
        </div>
      )}

      {/* Breadcrumb + Search */}
      <div className="flex items-center gap-3 mb-4">
        {pathStack.length > 0 && (
          <button onClick={navigateBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <button onClick={() => { setCurrentPath(""); setPathStack([]); }} className="hover:text-gray-800 transition-colors">Root</button>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              <span className="text-gray-700 font-medium">{crumb}</span>
            </span>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
        </div>
      </div>

      {/* File list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (folders.length === 0 && filteredFiles.length === 0) ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Upload className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 mb-1">No files here yet.</p>
          <p className="text-xs text-gray-400">Click "Upload Files" to add PDFs or documents.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Folders first */}
          {folders.map(folder => (
            <button key={folder.name} onClick={() => navigateInto(folder.name)}
              className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm hover:border-gray-300 transition-all text-left flex items-center gap-3">
              <FolderOpen className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <span className="font-medium text-gray-800 text-sm">{folder.name}</span>
              <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
            </button>
          ))}

          {/* Files */}
          {filteredFiles.map(file => {
            const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
            const dlInfo = downloadMap[filePath];
            const isExpanded = expandedLeads === filePath;

            return (
              <div key={file.name} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 flex items-center gap-4">
                  <FileText className="h-5 w-5 text-[#128ca0] flex-shrink-0" />

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{file.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      <span>{formatSize(file.metadata?.size)}</span>
                      <span>Added {formatDate(file.created_at)}</span>
                    </div>
                  </div>

                  {/* Download stats */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{dlInfo?.count ?? 0}</p>
                      <p className="text-xs text-gray-400">downloads</p>
                    </div>
                    {dlInfo && dlInfo.count > 0 && (
                      <button onClick={() => setExpandedLeads(isExpanded ? null : filePath)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#128ca0] bg-[#128ca0]/10 rounded-lg hover:bg-[#128ca0]/20 transition-colors">
                        <Users className="h-3.5 w-3.5" />
                        {dlInfo.leads.length} lead{dlInfo.leads.length !== 1 ? "s" : ""}
                        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {deletingPath === filePath ? (
                      <>
                        <button onClick={() => handleDelete(file.name)}
                          className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors" title="Confirm delete">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeletingPath(null)}
                          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setDeletingPath(filePath)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Leads panel */}
                {isExpanded && dlInfo && dlInfo.leads.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Download History - {dlInfo.leads.length} lead{dlInfo.leads.length !== 1 ? "s" : ""}
                    </p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {dlInfo.leads
                        .sort((a, b) => new Date(b.downloaded_at).getTime() - new Date(a.downloaded_at).getTime())
                        .map((lead, i) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-2 border border-gray-100">
                            <div>
                              <span className="font-medium text-gray-800">{lead.user_name || "Anonymous"}</span>
                              {lead.user_email && (
                                <span className="text-gray-400 ml-2">{lead.user_email}</span>
                              )}
                            </div>
                            <span className="text-gray-400 flex-shrink-0 ml-4">{formatDateTime(lead.downloaded_at)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
