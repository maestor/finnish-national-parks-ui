import { ThreeDotPulse } from "../ui/three-dot-pulse";

export const MapLoadingFallback = () => (
  <div className="flex h-full min-h-80 w-full items-center justify-center">
    <ThreeDotPulse size="lg" />
  </div>
);
