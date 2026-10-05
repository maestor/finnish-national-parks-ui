import { CONTROL_SURFACE_CLASS_NAME, PANEL_SURFACE_CLASS_NAME } from "@/components/ui/theme-styles";

export const PUBLIC_PAGE_SHELL_CLASS_NAME =
  "mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-2 py-6 sm:px-4";

const PUBLIC_PANEL_SURFACE_CLASS_NAME = `rounded-[2rem] ${PANEL_SURFACE_CLASS_NAME}`;

export const PUBLIC_PANEL_CLASS_NAME = `${PUBLIC_PANEL_SURFACE_CLASS_NAME} p-5 sm:p-6`;

export const PUBLIC_CONTENT_PANEL_CLASS_NAME = `${PUBLIC_PANEL_SURFACE_CLASS_NAME} p-3 sm:p-6`;

export const PUBLIC_PANEL_ICON_SURFACE_CLASS_NAME = `inline-flex h-11 w-11 items-center justify-center rounded-[1.1rem] ${CONTROL_SURFACE_CLASS_NAME} text-icon`;

export const PUBLIC_EYEBROW_BADGE_CLASS_NAME =
  "inline-flex items-center gap-2 rounded-full border border-border theme-memory px-3 py-1 text-sm font-medium text-link";

export const PUBLIC_META_BADGE_CLASS_NAME =
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-control px-3 py-1 text-xs font-medium text-muted-foreground shadow-[0_1px_2px_rgba(var(--shadow-rgb),0.12),inset_0_1px_0_rgba(var(--highlight-rgb),0.48)] dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.06)]";

export const PUBLIC_HERO_ICON_BUTTON_CLASS_NAME =
  "inline-flex items-center justify-center rounded-full border border-border bg-control p-2 text-muted-foreground shadow-[0_8px_20px_rgba(var(--shadow-rgb),0.18)] backdrop-blur-sm transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-control dark:shadow-[0_12px_24px_rgba(var(--shadow-rgb),0.24)]";

export const PUBLIC_META_DATE_CLASS_NAME =
  "inline-flex items-center gap-1.5 text-sm font-medium text-link";

export const PUBLIC_HERO_HEADING_STACK_CLASS_NAME = "space-y-2";

export const PUBLIC_HERO_TITLE_CLASS_NAME = "mt-1 text-3xl font-bold tracking-tight sm:text-4xl";

export const PUBLIC_HERO_DESCRIPTION_CLASS_NAME =
  "text-sm leading-6 text-muted-foreground sm:text-base";

export const PUBLIC_EMPTY_STATE_PANEL_CLASS_NAME =
  "rounded-[2rem] border border-dashed border-border theme-panel p-8 text-center backdrop-blur-sm";
