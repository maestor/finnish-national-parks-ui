import { ImageResponse } from "next/og";
import type { ReactElement } from "react";

export type SocialPreviewVariant = "square" | "landscape";

type SocialPreviewImageProps = {
  title: string;
  description: string;
  variant: SocialPreviewVariant;
};

type CreateSocialPreviewImageResponseOptions = SocialPreviewImageProps & {
  width: number;
  height: number;
};

const BrandIllustration = ({ compact = false }: { compact?: boolean }): ReactElement => {
  const outerSize = compact ? 240 : 320;
  const innerSize = compact ? 154 : 206;
  const sceneSize = compact ? 98 : 132;

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
          background: "rgba(248,250,252,0.12)",
        }}
      />
      <div
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: 999,
          background: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 24px 48px rgba(15, 23, 42, 0.18)",
        }}
      >
        <div
          style={{
            width: sceneSize,
            height: sceneSize,
            borderRadius: 999,
            overflow: "hidden",
            position: "relative",
            display: "flex",
            background: "linear-gradient(180deg, #dcfce7 0%, #bfdbfe 100%)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: compact ? 8 : 10,
              right: compact ? 8 : 10,
              bottom: compact ? 12 : 18,
              height: compact ? 18 : 24,
              borderRadius: 999,
              background: "#38bdf8",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: compact ? 20 : 28,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: compact ? 4 : 6,
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: compact ? "14px solid transparent" : "18px solid transparent",
                borderRight: compact ? "14px solid transparent" : "18px solid transparent",
                borderBottom: compact ? "24px solid #22c55e" : "30px solid #22c55e",
              }}
            />
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: compact ? "12px solid transparent" : "16px solid transparent",
                borderRight: compact ? "12px solid transparent" : "16px solid transparent",
                borderBottom: compact ? "22px solid #16a34a" : "28px solid #16a34a",
              }}
            />
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: compact ? "10px solid transparent" : "14px solid transparent",
                borderRight: compact ? "10px solid transparent" : "14px solid transparent",
                borderBottom: compact ? "18px solid #15803d" : "24px solid #15803d",
              }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              left: compact ? 12 : 18,
              right: compact ? 12 : 18,
              bottom: compact ? 24 : 34,
              height: compact ? 8 : 10,
              borderRadius: 999,
              background: "#86efac",
            }}
          />
        </div>
      </div>
      <div
        style={{
          width: compact ? 96 : 118,
          height: compact ? 96 : 118,
          position: "absolute",
          bottom: compact ? 10 : 12,
          borderRadius: compact ? 24 : 30,
          transform: "rotate(45deg)",
          background: "#f8fafc",
          boxShadow: "0 20px 36px rgba(15, 23, 42, 0.16)",
        }}
      />
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
        background: "linear-gradient(145deg, #166534 0%, #0f766e 52%, #2563eb 100%)",
        color: "#f8fafc",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 60,
          borderRadius: 80,
          border: "1px solid rgba(248,250,252,0.14)",
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
            color: "rgba(248,250,252,0.92)",
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
};

const LandscapeSocialPreviewImage = ({
  title,
  description,
}: Pick<SocialPreviewImageProps, "title" | "description">): ReactElement => {
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
        background: "linear-gradient(145deg, #166534 0%, #0f766e 52%, #2563eb 100%)",
        color: "#f8fafc",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 32,
          borderRadius: 48,
          border: "1px solid rgba(248,250,252,0.14)",
        }}
      />
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
            color: "rgba(248,250,252,0.92)",
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
};

export const SocialPreviewImage = ({
  title,
  description,
  variant,
}: SocialPreviewImageProps): ReactElement => {
  if (variant === "landscape") {
    return <LandscapeSocialPreviewImage title={title} description={description} />;
  }

  return <SquareSocialPreviewImage title={title} description={description} />;
};

export const createSocialPreviewImageResponse = ({
  title,
  description,
  variant,
  width,
  height,
}: CreateSocialPreviewImageResponseOptions): ImageResponse => {
  return new ImageResponse(
    <SocialPreviewImage title={title} description={description} variant={variant} />,
    {
      width,
      height,
    },
  );
};
