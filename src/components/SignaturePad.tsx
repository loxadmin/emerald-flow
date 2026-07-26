import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eraser, PenLine, Upload } from "lucide-react";

type Props = {
  value: string | null;
  onChange: (dataUrl: string | null, mime: string) => void;
};

/**
 * Two ways to provide a signature: upload an image, or draw it directly.
 * Emits a base64 data URL either way.
 */
export default function SignaturePad({ value, onChange }: Props) {
  const [mode, setMode] = useState<"upload" | "draw">("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    if (mode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111111";
    dirty.current = false;
  }, [mode]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    dirty.current = true;
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (dirty.current && canvasRef.current) {
      onChange(canvasRef.current.toDataURL("image/png"), "image/png");
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    dirty.current = false;
    onChange(null, "image/png");
  };

  const handleFile = (f: File | null) => {
    if (!f) {
      setFileName(null);
      onChange(null, "image/png");
      return;
    }
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string, f.type || "image/png");
    reader.readAsDataURL(f);
  };

  const switchMode = (m: "upload" | "draw") => {
    if (m === mode) return;
    setMode(m);
    setFileName(null);
    onChange(null, "image/png");
  };

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-md border border-border p-0.5">
        <button
          type="button"
          onClick={() => switchMode("upload")}
          className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "upload" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Upload className="h-3.5 w-3.5" /> Upload signature
        </button>
        <button
          type="button"
          onClick={() => switchMode("draw")}
          className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "draw" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <PenLine className="h-3.5 w-3.5" /> Draw signature
        </button>
      </div>

      {mode === "upload" ? (
        <div>
          <Input
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
          />
          {fileName && <p className="mt-1 text-xs text-muted-foreground">{fileName}</p>}
          {value && (
            <div className="mt-3 inline-block rounded-md border border-border bg-white p-2">
              <img src={value} alt="Signature preview" className="max-h-20" />
            </div>
          )}
        </div>
      ) : (
        <div>
          <canvas
            ref={canvasRef}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            className="h-40 w-full touch-none rounded-md border border-border bg-white"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={clear}>
              <Eraser className="mr-1 h-3.5 w-3.5" /> Clear
            </Button>
            <p className="text-xs text-muted-foreground">Sign with your mouse, trackpad or finger.</p>
          </div>
        </div>
      )}
    </div>
  );
}
