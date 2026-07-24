import { ThreeDotPulse } from "./three-dot-pulse";

interface LoadingSpinnerProps {
  label?: string;
}

export const LoadingSpinner = ({ label }: LoadingSpinnerProps) => {
  const hasLabel = label !== undefined && label.length > 0;

  return (
    <output className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
      <ThreeDotPulse size="lg" />
      {hasLabel === true && <span className="text-sm text-muted-foreground">{label}</span>}
    </output>
  );
};
