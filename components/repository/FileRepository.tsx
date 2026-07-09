"use client";

import {
  useState, useEffect, useCallback, useRef, useMemo, memo,
} from "react";
import {
  Folder, FolderPlus, Upload, Search, LayoutGrid, List as ListIcon,
  MoreVertical, Download, Pencil, FolderInput, Trash2, ChevronRight,
  Home, Loader2, X, FileText, Image as ImageIcon, Film, Music,
  FileArchive, FileSpreadsheet, FileType, File as FileIcon, ChevronDown,
  AlertCircle, CheckCircle2, RotateCcw,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// Types

interface RepoActor { userId: string; name: string; email: string }

interface RepoFolderItem {
  id: string;
  kind: "folder";
  name: string;
  parentId: string | null;
  createdBy: RepoActor | null;
  createdAt: string;
  updatedAt: string;
}

interface RepoFileItem {
  id: string;
  kind: "file";
  name: string;
  folderId: string | null;
  mimeType: string;
  ext: string;
  size: number;
  category: string;
  uploadedBy: RepoActor | null;
  uploadedAt: string;
  lastModifiedAt: string;
  downloadUrl: string;
}

type RepoItem = RepoFolderItem | RepoFileItem;

interface Breadcrumb { id: string | null; name: string }

interface UploadEntry {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

type SortKey = "name" | "created" | "modified" | "size";
type SortDir = "asc" | "desc";
type ViewMode = "grid" | "list";

const TYPE_FILTERS: { key: string; label: string }[] = [
  { key: "", label: "All types" },
  { key: "image", label: "Images" },
  { key: "video", label: "Videos" },
  { key: "pdf", label: "PDFs" },
  { key: "document", label: "Documents" },
  { key: "spreadsheet", label: "Spreadsheets" },
  { key: "presentation", label: "Presentations" },
  { key: "audio", label: "Audio" },
  { key: "archive", label: "Archives" },
  { key: "other", label: "Other" },
];

const MAX_UPLOAD_MB = 100;
const UPLOAD_CONCURRENCY = 3;

// ── Formatting helpers ──────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

function fileIconFor(category: string) {
  switch (category) {
    case "image": return { Icon: ImageIcon, color: "text-fuchsia-500", bg: "bg-fuchsia-50" };
    case "video": return { Icon: Film, color: "text-rose-500", bg: "bg-rose-50" };
    case "audio": return { Icon: Music, color: "text-violet-500", bg: "bg-violet-50" };
    case "pdf": return { Icon: FileText, color: "text-red-500", bg: "bg-red-50" };
    case "document": return { Icon: FileType, color: "text-blue-500", bg: "bg-blue-50" };
    case "spreadsheet": return { Icon: FileSpreadsheet, color: "text-emerald-600", bg: "bg-emerald-50" };
    case "presentation": return { Icon: FileText, color: "text-orange-500", bg: "bg-orange-50" };
    case "archive": return { Icon: FileArchive, color: "text-amber-600", bg: "bg-amber-50" };
    default: return { Icon: FileIcon, color: "text-gray-500", bg: "bg-gray-50" };
  }
}

// ── Upload (XHR for per-file progress) ─────────────────────────────────────────

function uploadOne(
  file: File,
  folderId: string | null,
  onProgress: (pct: number) => void
): Promise<RepoFileItem> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/repository/files");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data: any = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* non-JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as RepoFileItem);
      else reject(new Error(data.error || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    const fd = new FormData();
    fd.append("file", file);
    if (folderId) fd.append("folderId", folderId);
    xhr.send(fd);
  });
}

// ── Prompt dialog (create / rename) ─────────────────────────────────────────────

function PromptDialog({
  open, title, label, initialValue, confirmLabel, busy, onConfirm, onCancel,
}: {
  open: boolean;
  title: string;
  label: string;
  initialValue?: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(initialValue ?? "");
      // Focus + select the base name for quick renames.
      setTimeout(() => {
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        const dot = (initialValue ?? "").lastIndexOf(".");
        el.setSelectionRange(0, dot > 0 ? dot : (initialValue ?? "").length);
      }, 30);
    }
  }, [open, initialValue]);

  if (!open) return null;

  const submit = () => {
    const v = value.trim();
    if (v) onConfirm(v);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => !busy && onCancel()} />
      <div className="relative w-full max-w-sm rounded-xl bg-white shadow-xl border border-gray-100 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">{label}</label>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape" && !busy) onCancel();
            }}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={busy || !value.trim()}>
            {busy && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Move dialog ─────────────────────────────────────────────────────────────────

function MoveDialog({
  open, item, busy, onConfirm, onCancel,
}: {
  open: boolean;
  item: RepoItem | null;
  busy: boolean;
  onConfirm: (targetFolderId: string | null) => void;
  onCancel: () => void;
}) {
  const [folders, setFolders] = useState<RepoFolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTarget(null);
    setLoading(true);
    fetch("/api/repository/folders/tree")
      .then((r) => r.json())
      .then((d) => setFolders(Array.isArray(d.folders) ? d.folders : []))
      .catch(() => setFolders([]))
      .finally(() => setLoading(false));
  }, [open]);

  // Descendants of a moved folder (and itself) are invalid destinations.
  const invalid = useMemo(() => {
    const set = new Set<string>();
    if (item?.kind === "folder") {
      set.add(item.id);
      const byParent = new Map<string | null, RepoFolderItem[]>();
      for (const f of folders) {
        const arr = byParent.get(f.parentId) ?? [];
        arr.push(f); byParent.set(f.parentId, arr);
      }
      const stack = [item.id];
      while (stack.length) {
        const cur = stack.pop()!;
        for (const child of byParent.get(cur) ?? []) {
          if (!set.has(child.id)) { set.add(child.id); stack.push(child.id); }
        }
      }
    }
    return set;
  }, [item, folders]);

  const currentParent = item ? (item.kind === "folder" ? item.parentId : item.folderId) : null;

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => !busy && onCancel()} />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-100 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">
          Move “{item.name}”
        </h2>
        <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-50">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-gray-500 p-4 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading folders…
            </div>
          ) : (
            <>
              <button
                disabled={currentParent === null}
                onClick={() => setTarget(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  target === null ? "bg-emerald-50 text-emerald-700" : "hover:bg-gray-50 text-gray-700"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Home className="h-4 w-4 shrink-0" /> Repository root
                {currentParent === null && <span className="text-[10px] text-gray-400 ml-auto">current</span>}
              </button>
              {folders.map((f) => {
                const disabled = invalid.has(f.id) || f.id === currentParent;
                return (
                  <button
                    key={f.id}
                    disabled={disabled}
                    onClick={() => setTarget(f.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                      target === f.id ? "bg-emerald-50 text-emerald-700" : "hover:bg-gray-50 text-gray-700"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <Folder className="h-4 w-4 shrink-0 text-emerald-500" /> {f.name}
                    {f.id === currentParent && <span className="text-[10px] text-gray-400 ml-auto">current</span>}
                  </button>
                );
              })}
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button
            size="sm"
            onClick={() => onConfirm(target)}
            disabled={busy || target === currentParent}
          >
            {busy && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            Move here
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Action (context) menu ───────────────────────────────────────────────────────

interface MenuState { open: boolean; x: number; y: number; item: RepoItem | null }

function ActionMenu({
  state, canManage, onClose, onRename, onMove, onDownload, onDelete,
}: {
  state: MenuState;
  canManage: boolean;
  onClose: () => void;
  onRename: (item: RepoItem) => void;
  onMove: (item: RepoItem) => void;
  onDownload: (item: RepoFileItem) => void;
  onDelete: (item: RepoItem) => void;
}) {
  useEffect(() => {
    if (!state.open) return;
    const close = () => onClose();
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [state.open, onClose]);

  if (!state.open || !state.item) return null;
  const item = state.item;

  // Clamp to viewport.
  const x = Math.min(state.x, (typeof window !== "undefined" ? window.innerWidth : 9999) - 180);
  const y = Math.min(state.y, (typeof window !== "undefined" ? window.innerHeight : 9999) - 190);

  return (
    <div
      className="fixed z-[90] w-44 rounded-lg bg-white shadow-lg border border-gray-100 py-1 text-sm"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {item.kind === "file" && (
        <button
          className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
          onClick={() => { onDownload(item as RepoFileItem); onClose(); }}
        >
          <Download className="h-3.5 w-3.5" /> Download
        </button>
      )}
      {canManage && (
        <>
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
            onClick={() => { onRename(item); onClose(); }}
          >
            <Pencil className="h-3.5 w-3.5" /> Rename
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
            onClick={() => { onMove(item); onClose(); }}
          >
            <FolderInput className="h-3.5 w-3.5" /> Move
          </button>
          <div className="my-1 border-t border-gray-50" />
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50"
            onClick={() => { onDelete(item); onClose(); }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </>
      )}
      {!canManage && item.kind === "folder" && (
        <div className="px-3 py-1.5 text-xs text-gray-400">No actions available</div>
      )}
    </div>
  );
}

// ── Cards ───────────────────────────────────────────────────────────────────────

const FolderCard = memo(function FolderCard({
  folder, view, onOpen, onMenu,
}: {
  folder: RepoFolderItem;
  view: ViewMode;
  onOpen: (f: RepoFolderItem) => void;
  onMenu: (e: React.MouseEvent, item: RepoItem) => void;
}) {
  if (view === "list") {
    return (
      <div
        className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-emerald-50/50 cursor-pointer border border-transparent hover:border-emerald-100"
        onDoubleClick={() => onOpen(folder)}
        onClick={() => onOpen(folder)}
        onContextMenu={(e) => onMenu(e, folder)}
      >
        <Folder className="h-5 w-5 text-emerald-500 shrink-0" fill="currentColor" fillOpacity={0.15} />
        <span className="flex-1 min-w-0 truncate text-sm font-medium text-gray-800">{folder.name}</span>
        <span className="hidden sm:block text-xs text-gray-400 w-28 shrink-0">Folder</span>
        <span className="hidden md:block text-xs text-gray-400 w-24 shrink-0">{formatDate(folder.updatedAt)}</span>
        <button
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 text-gray-500"
          onClick={(e) => { e.stopPropagation(); onMenu(e, folder); }}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    );
  }
  return (
    <div
      className="group relative flex flex-col items-center gap-2 p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-200 hover:shadow-sm cursor-pointer transition-all"
      onDoubleClick={() => onOpen(folder)}
      onClick={() => onOpen(folder)}
      onContextMenu={(e) => onMenu(e, folder)}
    >
      <button
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/70 text-gray-500"
        onClick={(e) => { e.stopPropagation(); onMenu(e, folder); }}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      <Folder className="h-12 w-12 text-emerald-500" fill="currentColor" fillOpacity={0.18} />
      <span className="w-full text-center truncate text-sm font-medium text-gray-800" title={folder.name}>
        {folder.name}
      </span>
    </div>
  );
});

const FileCard = memo(function FileCard({
  file, view, onMenu, onDownload,
}: {
  file: RepoFileItem;
  view: ViewMode;
  onMenu: (e: React.MouseEvent, item: RepoItem) => void;
  onDownload: (f: RepoFileItem) => void;
}) {
  const { Icon, color, bg } = fileIconFor(file.category);

  if (view === "list") {
    return (
      <div
        className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-default border border-transparent hover:border-gray-100"
        onDoubleClick={() => onDownload(file)}
        onContextMenu={(e) => onMenu(e, file)}
      >
        <span className={`flex h-8 w-8 items-center justify-center rounded-md ${bg} shrink-0`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </span>
        <span className="flex-1 min-w-0 truncate text-sm font-medium text-gray-800" title={file.name}>{file.name}</span>
        <span className="hidden sm:block text-xs text-gray-400 w-28 shrink-0 capitalize">{file.category}</span>
        <span className="hidden md:block text-xs text-gray-400 w-24 shrink-0">{formatDate(file.lastModifiedAt)}</span>
        <span className="hidden lg:block text-xs text-gray-400 w-20 shrink-0">{formatBytes(file.size)}</span>
        <button
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 text-gray-500"
          onClick={(e) => { e.stopPropagation(); onMenu(e, file); }}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    );
  }
  return (
    <div
      className="group relative flex flex-col gap-2 p-3 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm cursor-default transition-all"
      onDoubleClick={() => onDownload(file)}
      onContextMenu={(e) => onMenu(e, file)}
    >
      <button
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 text-gray-500 z-10"
        onClick={(e) => { e.stopPropagation(); onMenu(e, file); }}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      <div className={`flex items-center justify-center h-24 rounded-lg ${bg}`}>
        <Icon className={`h-10 w-10 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-800" title={file.name}>{file.name}</p>
        <p className="text-[11px] text-gray-400">{formatBytes(file.size)} · {formatDate(file.lastModifiedAt)}</p>
      </div>
    </div>
  );
});

// ── Main component ──────────────────────────────────────────────────────────────

export function FileRepository() {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [folders, setFolders] = useState<RepoFolderItem[]>([]);
  const [files, setFiles] = useState<RepoFileItem[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<ViewMode>("grid");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [dragging, setDragging] = useState(false);

  const [menu, setMenu] = useState<MenuState>({ open: false, x: 0, y: 0, item: null });
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<RepoItem | null>(null);
  const [moveTarget, setMoveTarget] = useState<RepoItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RepoItem | null>(null);
  // When a non-empty folder deletion is attempted, holds its child counts and
  // switches the confirm dialog into "delete everything" mode.
  const [recursiveConfirm, setRecursiveConfirm] = useState<{ subfolderCount: number; fileCount: number } | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const reqRef = useRef(0);
  const dragCounter = useRef(0);
  // Current folder, mirrored in a ref so async upload callbacks compare against
  // the folder that's open when they resolve (not the one captured at start).
  const folderIdRef = useRef(folderId);
  useEffect(() => { folderIdRef.current = folderId; }, [folderId]);

  const searching = debouncedSearch.trim().length > 0;

  // Restore persisted view preference.
  useEffect(() => {
    const v = localStorage.getItem("repo:view");
    if (v === "grid" || v === "list") setView(v);
  }, []);
  useEffect(() => { localStorage.setItem("repo:view", view); }, [view]);

  // Debounce search.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    const reqId = ++reqRef.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searching) params.set("q", debouncedSearch.trim());
      else params.set("folderId", folderId ?? "root");
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/repository/browse?${params.toString()}`);
      const data = await res.json();
      if (reqRef.current !== reqId) return;
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setFolders(data.folders || []);
      setFiles(data.files || []);
      setBreadcrumbs(data.breadcrumbs || []);
      setCanManage(!!data.canManage);
    } catch (err: any) {
      if (reqRef.current === reqId) setError(err.message || "Failed to load repository");
    } finally {
      if (reqRef.current === reqId) setLoading(false);
    }
  }, [folderId, debouncedSearch, typeFilter, searching]);

  useEffect(() => { load(); }, [load]);

  // Client-side sort keeps ordering correct after optimistic inserts/renames.
  const sortedFolders = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...folders].sort((a, b) => {
      if (sortKey === "created") return (a.createdAt < b.createdAt ? -1 : 1) * dir;
      if (sortKey === "modified") return (a.updatedAt < b.updatedAt ? -1 : 1) * dir;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) * dir;
    });
  }, [folders, sortKey, sortDir]);

  const sortedFiles = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...files].sort((a, b) => {
      if (sortKey === "size") return (a.size - b.size) * dir;
      if (sortKey === "created") return (a.uploadedAt < b.uploadedAt ? -1 : 1) * dir;
      if (sortKey === "modified") return (a.lastModifiedAt < b.lastModifiedAt ? -1 : 1) * dir;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) * dir;
    });
  }, [files, sortKey, sortDir]);

  const isEmpty = folders.length === 0 && files.length === 0;

  // ── Navigation ────────────────────────────────────────────────────────────────
  const openFolder = useCallback((f: RepoFolderItem) => {
    setSearch("");
    setDebouncedSearch("");
    setFolderId(f.id);
  }, []);

  const navigateTo = useCallback((id: string | null) => {
    setSearch("");
    setDebouncedSearch("");
    setFolderId(id);
  }, []);

  // ── Uploads ─────────────────────────────────────────────────────────────────
  const startUploads = useCallback((fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;

    // Files are stored against the folder that's open when the upload starts.
    const targetFolder = folderId;
    const targetSnapshot = folderId;
    const searchingSnapshot = searching;

    const entries: UploadEntry[] = arr.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: f.name,
      size: f.size,
      progress: 0,
      status: "uploading",
    }));
    setUploads((prev) => [...entries, ...prev]);

    const patch = (id: string, p: Partial<UploadEntry>) =>
      setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...p } : u)));

    let cursor = 0;
    const runNext = async (): Promise<void> => {
      const index = cursor++;
      if (index >= arr.length) return;
      const file = arr[index];
      const entry = entries[index];

      if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
        patch(entry.id, { status: "error", error: `Exceeds ${MAX_UPLOAD_MB} MB limit` });
        return runNext();
      }
      try {
        const created = await uploadOne(file, targetFolder, (pct) => patch(entry.id, { progress: pct }));
        patch(entry.id, { status: "done", progress: 100 });
        // Reflect the new file immediately if the user is still looking at its folder.
        if (!searchingSnapshot && targetSnapshot === folderIdRef.current) {
          setFiles((prev) => (prev.some((f) => f.id === created.id) ? prev : [created, ...prev]));
        }
      } catch (err: any) {
        patch(entry.id, { status: "error", error: err.message || "Upload failed" });
      }
      return runNext();
    };

    // Bounded concurrency pool.
    for (let i = 0; i < Math.min(UPLOAD_CONCURRENCY, arr.length); i++) void runNext();
  }, [folderId, searching]);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) startUploads(e.target.files);
    e.target.value = "";
  };

  const clearFinishedUploads = () =>
    setUploads((prev) => prev.filter((u) => u.status === "uploading"));

  // ── Drag & drop ───────────────────────────────────────────────────────────────
  const onDragEnter = (e: React.DragEvent) => {
    if (!canManage) return;
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    dragCounter.current += 1;
    setDragging(true);
  };
  const onDragOver = (e: React.DragEvent) => {
    if (canManage && Array.from(e.dataTransfer.types).includes("Files")) e.preventDefault();
  };
  const onDragLeave = (e: React.DragEvent) => {
    if (!canManage) return;
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) { dragCounter.current = 0; setDragging(false); }
  };
  const onDrop = (e: React.DragEvent) => {
    if (!canManage) return;
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    if (e.dataTransfer.files?.length) startUploads(e.dataTransfer.files);
  };

  // ── Item mutations (optimistic) ─────────────────────────────────────────────────
  const openMenu = useCallback((e: React.MouseEvent, item: RepoItem) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ open: true, x: e.clientX, y: e.clientY, item });
  }, []);

  const downloadFile = useCallback((f: RepoFileItem) => {
    // A hidden anchor triggers a browser download via the streaming endpoint.
    const a = document.createElement("a");
    a.href = f.downloadUrl;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  const createFolder = async (name: string) => {
    setDialogBusy(true);
    try {
      const res = await fetch("/api/repository/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId: folderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create folder");
      if (!searching) setFolders((prev) => [data, ...prev]);
      toast.success("Folder created");
      setNewFolderOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create folder");
    } finally {
      setDialogBusy(false);
    }
  };

  const renameItem = async (name: string) => {
    if (!renameTarget) return;
    setDialogBusy(true);
    const item = renameTarget;
    try {
      const url = item.kind === "folder"
        ? `/api/repository/folders/${item.id}`
        : `/api/repository/files/${item.id}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rename failed");
      if (item.kind === "folder") {
        setFolders((prev) => prev.map((f) => (f.id === item.id ? { ...f, ...data } : f)));
      } else {
        setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, ...data } : f)));
      }
      toast.success("Renamed");
      setRenameTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Rename failed");
    } finally {
      setDialogBusy(false);
    }
  };

  const moveItem = async (targetFolderId: string | null) => {
    if (!moveTarget) return;
    setDialogBusy(true);
    const item = moveTarget;
    try {
      const url = item.kind === "folder"
        ? `/api/repository/folders/${item.id}`
        : `/api/repository/files/${item.id}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: targetFolderId, folderId: targetFolderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Move failed");
      // It left the current view (unless searching, where it may still match).
      if (item.kind === "folder") setFolders((prev) => prev.filter((f) => f.id !== item.id));
      else setFiles((prev) => prev.filter((f) => f.id !== item.id));
      toast.success("Moved");
      setMoveTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Move failed");
    } finally {
      setDialogBusy(false);
    }
  };

  const closeDeleteDialog = useCallback(() => {
    setDeleteTarget(null);
    setRecursiveConfirm(null);
  }, []);

  const deleteItem = async (recursive: boolean) => {
    if (!deleteTarget) return;
    setDialogBusy(true);
    const item = deleteTarget;
    try {
      if (item.kind === "folder") {
        const res = await fetch(
          `/api/repository/folders/${item.id}${recursive ? "?recursive=1" : ""}`,
          { method: "DELETE" }
        );
        const data = await res.json();
        if (res.status === 409 && data.notEmpty) {
          // Non-empty folder: keep the dialog open and require explicit confirm.
          setRecursiveConfirm({
            subfolderCount: data.subfolderCount || 0,
            fileCount: data.fileCount || 0,
          });
          return;
        }
        if (!res.ok) throw new Error(data.error || "Delete failed");
        setFolders((prev) => prev.filter((f) => f.id !== item.id));
      } else {
        const res = await fetch(`/api/repository/files/${item.id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Delete failed");
        setFiles((prev) => prev.filter((f) => f.id !== item.id));
      }
      toast.success("Deleted");
      closeDeleteDialog();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    } finally {
      setDialogBusy(false);
    }
  };

  const activeUploads = uploads.filter((u) => u.status === "uploading").length;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div
      className="space-y-5 max-w-7xl relative"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Folder className="h-5 w-5 text-emerald-500" fill="currentColor" fillOpacity={0.18} />
            File Repository
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize, upload and manage your files and folders.
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setNewFolderOpen(true)}>
              <FolderPlus className="h-4 w-4 mr-1.5" /> New Folder
            </Button>
            <Button size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1.5" /> Upload
            </Button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onPickFiles} />
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 flex-wrap bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files and folders…"
            className="w-full pl-8 pr-8 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-gray-900"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100 text-gray-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="pl-3 pr-7 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-gray-900 appearance-none"
            aria-label="Filter by type"
          >
            {TYPE_FILTERS.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={`${sortKey}:${sortDir}`}
            onChange={(e) => {
              const [k, d] = e.target.value.split(":");
              setSortKey(k as SortKey);
              setSortDir(d as SortDir);
            }}
            className="pl-3 pr-7 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-gray-900 appearance-none"
            aria-label="Sort"
          >
            <option value="name:asc">Name (A–Z)</option>
            <option value="name:desc">Name (Z–A)</option>
            <option value="modified:desc">Modified (newest)</option>
            <option value="modified:asc">Modified (oldest)</option>
            <option value="created:desc">Created (newest)</option>
            <option value="created:asc">Created (oldest)</option>
            <option value="size:desc">Size (largest)</option>
            <option value="size:asc">Size (smallest)</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setView("grid")}
            className={`p-1.5 ${view === "grid" ? "bg-emerald-50 text-emerald-600" : "text-gray-400 hover:text-gray-600"}`}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-1.5 border-l border-gray-200 ${view === "list" ? "bg-emerald-50 text-emerald-600" : "text-gray-400 hover:text-gray-600"}`}
            aria-label="List view"
          >
            <ListIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      {!searching ? (
        <div className="flex items-center gap-1 text-sm text-gray-500 flex-wrap">
          <button
            onClick={() => navigateTo(null)}
            className="flex items-center gap-1 hover:text-emerald-600 transition-colors"
          >
            <Home className="h-3.5 w-3.5" /> Repository
          </button>
          {breadcrumbs.map((b) => (
            <span key={b.id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
              <button
                onClick={() => navigateTo(b.id)}
                className="hover:text-emerald-600 transition-colors truncate max-w-[160px]"
              >
                {b.name}
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Search results for “<span className="font-medium text-gray-700">{debouncedSearch}</span>”
        </p>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-16 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" size="sm" onClick={load}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Retry
          </Button>
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center border-2 border-dashed border-gray-100 rounded-xl">
          <Folder className="h-12 w-12 text-emerald-200" fill="currentColor" fillOpacity={0.3} />
          <p className="text-sm text-gray-500">
            {searching ? "No files or folders match your search."
              : typeFilter ? "No files of this type here."
              : "This folder is empty."}
          </p>
          {canManage && !searching && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setNewFolderOpen(true)}>
                <FolderPlus className="h-4 w-4 mr-1.5" /> New Folder
              </Button>
              <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1.5" /> Upload files
              </Button>
            </div>
          )}
          {canManage && !searching && (
            <p className="text-xs text-gray-400">…or drag &amp; drop files here</p>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="space-y-5">
          {sortedFolders.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Folders</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {sortedFolders.map((f) => (
                  <FolderCard key={f.id} folder={f} view="grid" onOpen={openFolder} onMenu={openMenu} />
                ))}
              </div>
            </div>
          )}
          {sortedFiles.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Files</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {sortedFiles.map((f) => (
                  <FileCard key={f.id} file={f} view="grid" onMenu={openMenu} onDownload={downloadFile} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          <div className="hidden sm:flex items-center gap-3 px-3 py-2 bg-gray-50/50 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
            <span className="w-8" />
            <span className="flex-1">Name</span>
            <span className="w-28">Type</span>
            <span className="hidden md:block w-24">Modified</span>
            <span className="hidden lg:block w-20">Size</span>
            <span className="w-7" />
          </div>
          {sortedFolders.map((f) => (
            <FolderCard key={f.id} folder={f} view="list" onOpen={openFolder} onMenu={openMenu} />
          ))}
          {sortedFiles.map((f) => (
            <FileCard key={f.id} file={f} view="list" onMenu={openMenu} onDownload={downloadFile} />
          ))}
        </div>
      )}

      {/* Drag overlay */}
      {dragging && (
        <div className="fixed inset-0 z-[80] bg-emerald-500/10 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-emerald-400 bg-white/90 px-10 py-8 shadow-lg">
            <Upload className="h-10 w-10 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-700">Drop files to upload</p>
          </div>
        </div>
      )}

      {/* Upload tray */}
      {uploads.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[85] w-80 max-w-[90vw] rounded-xl bg-white shadow-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-700">
              {activeUploads > 0 ? `Uploading ${activeUploads} file${activeUploads === 1 ? "" : "s"}…` : "Uploads"}
            </span>
            <button
              onClick={clearFinishedUploads}
              className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
              title="Clear finished"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
            {uploads.map((u) => (
              <div key={u.id} className="px-4 py-2.5 space-y-1.5">
                <div className="flex items-center gap-2">
                  {u.status === "done" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : u.status === "error" ? (
                    <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  ) : (
                    <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
                  )}
                  <span className="flex-1 min-w-0 truncate text-xs text-gray-700" title={u.name}>{u.name}</span>
                  <span className="text-[10px] text-gray-400">{formatBytes(u.size)}</span>
                </div>
                {u.status === "uploading" && (
                  <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${u.progress}%` }} />
                  </div>
                )}
                {u.status === "error" && (
                  <p className="text-[10px] text-red-500">{u.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menus & dialogs */}
      <ActionMenu
        state={menu}
        canManage={canManage}
        onClose={() => setMenu((m) => ({ ...m, open: false }))}
        onRename={(item) => setRenameTarget(item)}
        onMove={(item) => setMoveTarget(item)}
        onDownload={downloadFile}
        onDelete={(item) => { setRecursiveConfirm(null); setDeleteTarget(item); }}
      />

      <PromptDialog
        open={newFolderOpen}
        title="New folder"
        label="Folder name"
        confirmLabel="Create"
        busy={dialogBusy}
        onConfirm={createFolder}
        onCancel={() => setNewFolderOpen(false)}
      />

      <PromptDialog
        open={!!renameTarget}
        title={renameTarget?.kind === "folder" ? "Rename folder" : "Rename file"}
        label="Name"
        initialValue={renameTarget?.name}
        confirmLabel="Rename"
        busy={dialogBusy}
        onConfirm={renameItem}
        onCancel={() => setRenameTarget(null)}
      />

      <MoveDialog
        open={!!moveTarget}
        item={moveTarget}
        busy={dialogBusy}
        onConfirm={moveItem}
        onCancel={() => setMoveTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        destructive
        busy={dialogBusy}
        title={
          recursiveConfirm
            ? "Delete folder and its contents?"
            : deleteTarget?.kind === "folder" ? "Delete folder?" : "Delete file?"
        }
        description={
          recursiveConfirm ? (
            <>
              “{deleteTarget?.name}” contains{" "}
              {recursiveConfirm.subfolderCount > 0 && (
                <>{recursiveConfirm.subfolderCount} subfolder{recursiveConfirm.subfolderCount === 1 ? "" : "s"}</>
              )}
              {recursiveConfirm.subfolderCount > 0 && recursiveConfirm.fileCount > 0 && " and "}
              {recursiveConfirm.fileCount > 0 && (
                <>{recursiveConfirm.fileCount} file{recursiveConfirm.fileCount === 1 ? "" : "s"}</>
              )}
              . Everything inside will be permanently removed.{" "}
              <span className="font-medium text-red-600">This cannot be undone.</span>
            </>
          ) : deleteTarget?.kind === "folder" ? (
            <>Deleting “{deleteTarget?.name}” removes the folder. <span className="font-medium text-red-600">This cannot be undone.</span></>
          ) : (
            <>“{deleteTarget?.name}” and its stored file will be permanently removed. <span className="font-medium text-red-600">This cannot be undone.</span></>
          )
        }
        confirmLabel={recursiveConfirm ? "Delete everything" : "Delete"}
        onConfirm={() => deleteItem(!!recursiveConfirm)}
        onCancel={closeDeleteDialog}
      />

      <Toaster position="top-right" richColors />
    </div>
  );
}
