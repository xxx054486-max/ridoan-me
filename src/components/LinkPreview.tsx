import { ExternalLink } from "lucide-react";

interface LinkPreviewProps {
  url: string;
}

export default function LinkPreview({ url }: LinkPreviewProps) {
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url);
  const isYoutube = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/.exec(url);

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img src={url} alt="" className="w-full rounded-lg object-cover max-h-48 pointer-events-auto" style={{ pointerEvents: "auto" }} />
        <span className="text-[10px] text-primary truncate block mt-1">{url}</span>
      </a>
    );
  }

  if (isYoutube) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={`https://img.youtube.com/vi/${isYoutube[1]}/hqdefault.jpg`}
          alt="YouTube"
          className="w-full rounded-lg object-cover max-h-48 pointer-events-auto"
          style={{ pointerEvents: "auto" }}
        />
        <span className="text-[10px] text-primary truncate block mt-1">▶ {url}</span>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2.5 text-xs text-primary hover:bg-accent transition-colors"
    >
      <ExternalLink size={14} className="shrink-0" />
      <span className="truncate">{url}</span>
    </a>
  );
}
