import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone } from "lucide-react";

type Props = {
  path?: string | null;
  url?: string | null;
  type?: string | null;
  text?: string | null;
  compact?: boolean;
};

/** Shows the advertiser's offer (image/video and/or text) to admins. */
export default function AdvertiserOfferView({ path, url, type, text, compact }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!path) { setSrc(url || null); return; }
    supabase.storage.from("campaign-media").createSignedUrl(path, 60 * 60).then(({ data }) => {
      if (alive) setSrc(data?.signedUrl || url || null);
    });
    return () => { alive = false; };
  }, [path, url]);

  const hasText = !!text?.trim();
  if (!src && !hasText) {
    return <p className="text-xs text-muted-foreground">No offer provided</p>;
  }
  const isVideo = type?.startsWith("video/");
  const size = compact ? "h-16 w-16" : "max-h-64 w-full max-w-sm";

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Megaphone className="h-3.5 w-3.5" /> Advertiser offer
      </p>
      <div className={compact ? "flex items-start gap-3" : "space-y-2"}>
        {src && (
          <a href={src} target="_blank" rel="noreferrer" className="block shrink-0">
            {isVideo ? (
              <video src={src} controls={!compact} muted className={`${size} rounded-md border object-cover bg-background`} />
            ) : (
              <img src={src} alt="Advertiser offer" className={`${size} rounded-md border object-cover bg-background`} />
            )}
          </a>
        )}
        {hasText && <p className="text-sm text-foreground whitespace-pre-wrap break-words">{text}</p>}
      </div>
    </div>
  );
}
