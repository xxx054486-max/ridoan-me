export default function SkeletonCard() {
  return (
    <div className="bg-card rounded-lg p-4 space-y-3 animate-skeleton-pulse">
      <div className="flex items-center gap-2">
        <div className="h-5 w-24 bg-muted rounded-full" />
        <div className="h-4 w-16 bg-muted rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full bg-muted rounded" />
        <div className="h-4 w-3/4 bg-muted rounded" />
      </div>
      <div className="h-32 w-full bg-muted rounded-lg" />
      <div className="flex gap-3">
        <div className="h-8 w-20 bg-muted rounded-full" />
        <div className="h-8 w-20 bg-muted rounded-full" />
        <div className="h-8 w-20 bg-muted rounded-full" />
      </div>
    </div>
  );
}
