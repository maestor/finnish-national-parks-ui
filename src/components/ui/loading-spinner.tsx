import { ThreeDotPulse } from "./three-dot-pulse";

interface LoadingSpinnerProps {
  label?: string;
}

export const LoadingSpinner = ({ label }: LoadingSpinnerProps) => {
  return (
    <output className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
      <ThreeDotPulse size="lg" />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </output>
  );
};
