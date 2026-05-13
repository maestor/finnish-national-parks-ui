"use client";

interface MapContainerProps {
  className?: string;
}

export const MapContainer = ({ className }: MapContainerProps) => {
  return (
    <section className={className} aria-label="Map placeholder">
      <div className="flex h-full w-full items-center justify-center rounded-lg border border-border bg-muted">
        <p className="text-muted-foreground">Map will be rendered here</p>
      </div>
    </section>
  );
};
