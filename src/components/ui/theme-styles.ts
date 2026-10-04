/** App-wide paint recipes. Consumers keep their own geometry and interactions. */
export const PANEL_SURFACE_CLASS_NAME =
  "theme-panel border border-border shadow-panel backdrop-blur-xl";

export const MEMORY_SURFACE_CLASS_NAME = "theme-memory border border-border shadow-panel";

/** Opaque surface keeps small photo-overlay text readable over any image. */
export const IMAGE_OVERLAY_LABEL_CLASS_NAME =
  "border border-border bg-control text-foreground shadow-[0_2px_8px_rgba(var(--shadow-rgb),0.2)]";

export const CONTROL_SURFACE_CLASS_NAME =
  "border border-input bg-control text-foreground backdrop-blur-md";

export const FILLED_ACTION_CLASS_NAME = "theme-action border-input text-action-foreground";

export const PROGRESS_TRACK_CLASS_NAME =
  "overflow-hidden rounded-full bg-progress-track ring-1 ring-input";

export const PROGRESS_FILL_CLASS_NAME = "rounded-full theme-progress";

export const NATIVE_PROGRESS_CLASS_NAME = `${PROGRESS_TRACK_CLASS_NAME} theme-progress-native`;
