import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import { AppIconArtwork } from "./app-icon-artwork";

export type SocialPreviewVariant = "square" | "landscape";

// Mirror the dark site canvas (`.dark --background-image` in globals.css).
const SOCIAL_PREVIEW_BACKGROUND =
  "radial-gradient(ellipse at top left, #64704720, transparent 46%), linear-gradient(112deg, #17261f 0%, #172c2d 24%, #17344b 62%, #1c3c55 100%)";

type SocialPreviewImageProps = {
  title: string;
  description: string;
  imageUrl?: string | null;
  variant: SocialPreviewVariant;
  highlights?: string[];
};

type CreateSocialPreviewImageResponseOptions = SocialPreviewImageProps & {
  width: number;
  height: number;
};

const BrandIllustration = ({ compact = false }: { compact?: boolean }): ReactElement => {
  const outerSize = compact ? 240 : 320;
  const iconSize = compact ? 184 : 244;

  return (
    <div
      style={{
        width: outerSize,
        height: outerSize,
        display: "flex",
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: compact ? 14 : 18,
          borderRadius: 999,
          background: "rgba(232,229,215,0.12)",
        }}
      />
      <div
        style={{
          width: iconSize,
          height: iconSize,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 24px 48px rgba(8, 23, 32, 0.24)",
        }}
      >
        <AppIconArtwork
          style={{
            width: "100%",
            height: "100%",
          }}
          testId="social-preview-icon"
        />
      </div>
    </div>
  );
};

const SquareSocialPreviewImage = ({
  title,
  description,
}: Pick<SocialPreviewImageProps, "title" | "description">): ReactElement => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 48,
        padding: "110px 96px",
        background: SOCIAL_PREVIEW_BACKGROUND,
        color: "#e8e5d7",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 60,
          borderRadius: 80,
          border: "1px solid rgba(232,229,215,0.14)",
        }}
      />
      <BrandIllustration />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          textAlign: "center",
          maxWidth: 820,
        }}
      >
        <div
          style={{
            fontSize: 92,
            lineHeight: 1.05,
            fontWeight: 800,
            letterSpacing: "-0.04em",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 42,
            lineHeight: 1.3,
            color: "rgba(232,229,215,0.92)",
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
};

const HighlightChips = ({ highlights }: { highlights: string[] }): ReactElement => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        flexWrap: "wrap",
      }}
    >
      {highlights.map((highlight) => (
        <div
          key={highlight}
          style={{
            borderRadius: 999,
            border: "1px solid rgba(232,229,215,0.32)",
            background: "rgba(232,229,215,0.12)",
            padding: "14px 28px",
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: "-0.01em",
          }}
        >
          {highlight}
        </div>
      ))}
    </div>
  );
};

const LandscapeSocialPreviewImage = ({
  title,
  description,
  imageUrl,
  highlights,
}: Pick<
  SocialPreviewImageProps,
  "title" | "description" | "highlights" | "imageUrl"
>): ReactElement => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 56,
        padding: "72px 84px",
        background: SOCIAL_PREVIEW_BACKGROUND,
        color: "#e8e5d7",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 32,
          borderRadius: 48,
          border: "1px solid rgba(232,229,215,0.14)",
        }}
      />
      {imageUrl ? (
        <div
          style={{
            width: 360,
            height: 486,
            display: "flex",
            position: "relative",
            overflow: "hidden",
            borderRadius: 40,
            border: "1px solid rgba(232,229,215,0.18)",
            boxShadow: "0 30px 70px rgba(8, 23, 32, 0.28)",
            flexShrink: 0,
          }}
        >
          <div
            data-testid="social-preview-hero-image"
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${imageUrl})`,
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(8,23,32,0.06) 0%, rgba(8,23,32,0.18) 45%, rgba(8,23,32,0.74) 100%)",
            }}
          />
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 320,
          }}
        >
          <BrandIllustration compact />
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 24,
          flex: 1,
          maxWidth: 660,
        }}
      >
        <div
          style={{
            fontSize: 78,
            lineHeight: 1.02,
            fontWeight: 800,
            letterSpacing: "-0.04em",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 34,
            lineHeight: 1.35,
            color: "rgba(232,229,215,0.92)",
          }}
        >
          {description}
        </div>
        {highlights && highlights.length > 0 ? <HighlightChips highlights={highlights} /> : null}
      </div>
    </div>
  );
};

export const SocialPreviewImage = ({
  title,
  description,
  imageUrl,
  variant,
  highlights,
}: SocialPreviewImageProps): ReactElement => {
  if (variant === "landscape") {
    return (
      <LandscapeSocialPreviewImage
        title={title}
        description={description}
        imageUrl={imageUrl}
        highlights={highlights}
      />
    );
  }

  return <SquareSocialPreviewImage title={title} description={description} />;
};

export const createSocialPreviewImageResponse = ({
  title,
  description,
  imageUrl,
  variant,
  highlights,
  width,
  height,
}: CreateSocialPreviewImageResponseOptions): ImageResponse => {
  return new ImageResponse(
    <SocialPreviewImage
      title={title}
      description={description}
      imageUrl={imageUrl}
      variant={variant}
      highlights={highlights}
    />,
    {
      width,
      height,
    },
  );
};
