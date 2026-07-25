import { useRef, useState, type DragEvent } from "react";
import { UploadCloud, FolderOpen } from "lucide-react";

interface Props {
  onFiles: (files: File[]) => void;
  /** Drives the scanning-bar treatment while a batch is in flight. */
  busy?: boolean;
  hint?: string;
}

/**
 * Evidence intake tray. Dragging anything over it switches the border to
 * crimson and starts the glow; while uploads run, a scanner bar sweeps the
 * panel so the page still looks alive during long batches.
 */
export default function UploadDropzone({ onFiles, busy = false, hint }: Props) {
  const [dragDepth, setDragDepth] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragging = dragDepth > 0;

  // Depth counter, not a boolean: dragging across child elements fires
  // dragleave on the child before dragenter on the parent, which makes a
  // naive boolean flicker.
  const onDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragDepth((d) => d + 1);
  };
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragDepth((d) => Math.max(0, d - 1));
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragDepth(0);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  };

  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      className={`relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[14px] border border-dashed px-6 py-12 text-center transition-colors duration-200 ${
        dragging
          ? "animate-intake-glow border-iris bg-iris-wash/60"
          : "border-line bg-card/40 hover:border-line-strong hover:bg-card"
      }`}
    >
      {busy && (
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px animate-scan-sweep bg-gradient-to-r from-transparent via-iris to-transparent shadow-[0_0_12px_rgba(37,99,235,0.9)]" />
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />

      <span
        className={`mb-3 grid h-12 w-12 place-items-center rounded-xl border transition-all duration-200 ${
          dragging
            ? "-translate-y-1 scale-110 border-iris/40 bg-iris/15 text-iris-soft"
            : "border-line bg-well text-ink-faint"
        }`}
      >
        {dragging ? (
          <FolderOpen className="h-5 w-5 stroke-[1.5]" />
        ) : (
          <UploadCloud className="h-5 w-5 stroke-[1.5]" />
        )}
      </span>

      <p
        className={`text-[15px] font-medium transition-colors ${
          dragging ? "text-iris-soft" : "text-ink"
        }`}
      >
        {dragging ? "Release to upload" : "Upload assets to protect"}
      </p>
      <p className="mt-1 text-[13px] text-ink-faint">
        {hint ?? "Drag & drop images, or click to browse. Bulk drops welcome."}
      </p>
    </div>
  );
}
