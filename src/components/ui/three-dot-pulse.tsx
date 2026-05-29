interface ThreeDotPulseProps {
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
};

export const ThreeDotPulse = ({ size = "md" }: ThreeDotPulseProps) => {
  const dotClass = sizeClasses[size];

  return (
    <span className="inline-flex items-center gap-1.5" aria-hidden="true">
      <span className={`${dotClass} animate-dot-pulse-1 rounded-full bg-primary`} />
      <span className={`${dotClass} animate-dot-pulse-2 rounded-full bg-primary`} />
      <span className={`${dotClass} animate-dot-pulse-3 rounded-full bg-primary`} />
    </span>
  );
};
