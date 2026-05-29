interface LoadingSpinnerProps {
  label?: string;
}

export const LoadingSpinner = ({ label }: LoadingSpinnerProps) => {
  return (
    <output className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </output>
  );
};
