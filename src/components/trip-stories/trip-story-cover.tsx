import { Route } from "lucide-react";
import { AppImage } from "@/components/ui/app-image";
import type { TripStorySummary } from "@/lib/trips";

export const TripStoryCover = ({
  story,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
}: {
  story: Pick<TripStorySummary, "coverImage" | "name">;
  priority?: boolean;
  sizes?: string;
}) => (
  <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-100 via-sky-100 to-indigo-100 dark:from-emerald-950/80 dark:via-sky-950/80 dark:to-indigo-950/80">
    {story.coverImage ? (
      <AppImage
        src={story.coverImage.fullUrl}
        alt=""
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover"
      />
    ) : (
      <div
        className="flex h-full items-center justify-center text-primary/65"
        role="img"
        aria-label={`${story.name}: ei kansikuvaa`}
      >
        <Route className="h-16 w-16" aria-hidden="true" />
      </div>
    )}
  </div>
);
