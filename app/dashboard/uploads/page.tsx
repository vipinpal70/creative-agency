"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  UploadCloud,
  FileImage,
  FileVideo,
  FileText,
  File as FileIcon,
  ArrowUpRight,
  ChevronDown,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface Client {
  id: string;
  name: string;
}

interface Asset {
  id: string;
  name: string;
  mappedTo: string;
  clientName: string;
  type: "image" | "video" | "doc" | "other";
  date: string;
  url: string;
}

interface UploadState {
  fileName: string;
  progress: number;   // 0–100
  speed: number;      // bytes/s
  eta: number | null; // seconds remaining
  done: boolean;
  error: string | null;
}

const getFileIcon = (type: string) => {
  switch (type) {
    case "image": return <FileImage className="w-5 h-5 text-gray-400" />;
    case "video": return <FileVideo className="w-5 h-5 text-gray-400" />;
    case "doc": return <FileText className="w-5 h-5 text-gray-400" />;
    default: return <FileIcon className="w-5 h-5 text-gray-400" />;
  }
};

const determineFileType = (mime: string): Asset["type"] => {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.includes("pdf") || mime.includes("word") || mime.includes("officedocument")) return "doc";
  return "other";
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatEta(seconds: number) {
  if (!isFinite(seconds) || isNaN(seconds)) return "--";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

export default function CreativeUploadPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Fetch clients
  useEffect(() => {
    setClientsLoading(true);
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => {
        setClients(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to fetch clients:", err);
        setClients([]);
      })
      .finally(() => setClientsLoading(false));
  }, []);

  // Fetch recent uploads
  const fetchRecentUploads = () => {
    fetch("/api/creative-upload")
      .then((res) => res.json())
      .then((data) => {
        setRecentFiles(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to fetch recent uploads:", err);
        setRecentFiles([]);
      });
  };

  useEffect(() => {
    fetchRecentUploads();
  }, []);

  const assets: Asset[] = useMemo(() => {
    if (!Array.isArray(recentFiles)) return [];
    return recentFiles.map((file: any) => ({
      id: file.id,
      name: file.assetName || file.name,
      mappedTo: "Unmapped",
      clientName: file.clientName || "Unknown Client",
      type: determineFileType(file.fileType || ""),
      date: new Date(file.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      url: file.fileUrl,
    }));
  }, [recentFiles]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId]
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = (file: File) => {
    if (!file) return;
    if (!selectedClientId) { toast.error("Please select a client first"); return; }

    xhrRef.current?.abort();
    setUploadState({ fileName: file.name, progress: 0, speed: 0, eta: null, done: false, error: null });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("clientId", selectedClientId);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    const startTime = Date.now();

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const pct = (event.loaded / event.total) * 100;
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = elapsed > 0 ? event.loaded / elapsed : 0;
      const eta = speed > 0 ? (event.total - event.loaded) / speed : null;
      setUploadState((s) => s && { ...s, progress: pct, speed, eta });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploadState((s) => s && { ...s, progress: 100, done: true, eta: null });
        toast.success("File uploaded successfully");
        fetchRecentUploads();
      } else {
        let msg = "Upload failed";
        if (xhr.status === 401) {
          msg = "Session expired — please refresh";
        } else if (xhr.status === 413) {
          // Prefer the server's detailed message; fall back to a generic size error.
          try {
            msg = JSON.parse(xhr.responseText)?.error || "File is too large (max 50MB)";
          } catch {
            msg = "File is too large (max 50MB)";
          }
        } else {
          try {
            msg = JSON.parse(xhr.responseText)?.error || msg;
          } catch { /* keep default */ }
        }
        setUploadState((s) => s && { ...s, error: msg });
        toast.error(msg);
      }
    };

    xhr.onerror = () => {
      setUploadState((s) => s && { ...s, error: "Network error occurred" });
      toast.error("Network error occurred");
    };

    xhr.open("POST", "/api/creative-upload");
    xhr.send(formData);
  };

  const uploading = !!uploadState && !uploadState.done && !uploadState.error;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Creative Upload</h1>
          <p className="text-gray-400 text-sm">Upload and manage creative assets</p>
        </div>

        <div className="flex items-center gap-4">
          {selectedClient && (
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest leading-none mb-1">Target Folder</p>
              <p className="text-[11px] font-medium text-primary leading-none">
                /uploads/{selectedClient.name.toLowerCase().replace(/ /g, "_")}
              </p>
            </div>
          )}
          <div className="relative w-48">
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              disabled={clientsLoading}
              className="w-full appearance-none bg-white border border-gray-200 text-[11px] font-medium text-gray-900 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary block px-4 py-1.5 pr-8 cursor-pointer transition-all hover:border-primary/40 shadow-sm"
            >
              <option value="">Select Client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
              {clientsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronDown className="w-3 h-3" />}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Dropzone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => {
            if (selectedClientId && !uploading) {
              const fileInput = document.getElementById("file-input");
              fileInput?.click();
            }
          }}
          className={`relative group transition-all ${(!selectedClientId || uploading) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <input
            id="file-input"
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.mp4,.pdf"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleUpload(e.target.files[0]);
              }
            }}
            disabled={!selectedClientId || uploading}
          />
          <div className="absolute inset-0 bg-primary/20 rounded-lg -m-2 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className={`relative border-2 border-dashed rounded-lg bg-white p-12 text-center transition-all ${
            dragActive ? "border-primary bg-primary/5" : "border-gray-100 hover:border-primary/30"
          }`}>
            <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
              {uploading
                ? <Loader2 className="w-8 h-8 text-primary animate-spin" />
                : <UploadCloud className={`w-12 h-12 ${!selectedClientId ? "text-blue-500" : "text-blue-600"}`} />
              }
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              {uploading
                ? "Uploading your file…"
                : !selectedClientId
                  ? "Select a client to enable upload"
                  : "Drop files here or click to upload"}
            </h3>
            <p className="text-[11px] font-medium text-gray-400">
              {uploading
                ? `${Math.round(uploadState!.progress)}% complete`
                : !selectedClientId
                  ? "The file picker is locked"
                  : "PNG, JPG, MP4, PDF up to 50MB"}
            </p>
          </div>
        </div>

        {/* Progress Card */}
        {uploadState && (
          <div className={`bg-white border rounded-xl p-5 shadow-sm transition-all ${uploadState.done ? "border-emerald-100" : uploadState.error ? "border-red-100" : "border-gray-100"
            }`}>
            {/* Top row: icon + name/status + dismiss */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${uploadState.done ? "bg-emerald-50" : uploadState.error ? "bg-red-50" : "bg-primary/10"
                  }`}>
                  {uploadState.done
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    : uploadState.error
                      ? <X className="w-5 h-5 text-red-400" />
                      : <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{uploadState.fileName}</p>
                  <p className={`text-xs font-medium mt-0.5 ${uploadState.done ? "text-emerald-600" : uploadState.error ? "text-red-500" : "text-gray-400"
                    }`}>
                    {uploadState.done
                      ? "Upload complete — file is now in the repository"
                      : uploadState.error
                        ? uploadState.error
                        : `${Math.round(uploadState.progress)}% · ${formatBytes(uploadState.speed)}/s · ${formatEta(uploadState.eta ?? Infinity)} left`
                    }
                  </p>
                </div>
              </div>
              {(uploadState.done || uploadState.error) && (
                <button
                  onClick={() => setUploadState(null)}
                  className="p-1.5 text-gray-300 hover:text-gray-500 rounded-lg transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Progress bar */}
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${uploadState.done ? "bg-emerald-500" : uploadState.error ? "bg-red-400" : "bg-primary"
                  }`}
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>

            {/* Speed + ETA chips */}
            {!uploadState.done && !uploadState.error && (
              <div className="flex items-center gap-3 mt-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">
                  Speed: {formatBytes(uploadState.speed)}/s
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">
                  ETA: {formatEta(uploadState.eta ?? Infinity)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Recent Assets */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-50">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recent Assets</h2>
            <span className="text-[10px] font-medium text-gray-400">{assets.length} items</span>
          </div>
          {assets.slice(0, 5).map((asset) => (
            <div
              key={asset.id}
              className="group relative bg-white rounded-lg border border-gray-100 p-4 flex items-center justify-between transition-all shadow-xs hover:shadow-md hover:shadow-gray-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors border border-gray-50 group-hover:border-primary/20">
                  {getFileIcon(asset.type)}
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors">{asset.name}</h4>
                  <div className="flex items-center gap-2 text-[11px] font-medium text-gray-400">
                    <span>Mapped to:</span>
                    <span className="text-gray-900 leading-none">{asset.clientName}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Uploaded</p>
                  <p className="text-xs font-medium text-gray-900 tabular-nums">{asset.date}</p>
                </div>
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-7 h-7 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:text-primary hover:border-primary/30 hover:bg-primary/10 transition-all opacity-0 group-hover:opacity-100"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
