import { ImageResponse } from "next/og";
import type { ReactElement } from "react";

export const PwaIcon = (): ReactElement => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        borderRadius: 128,
        overflow: "hidden",
        background: "linear-gradient(145deg, #166534 0%, #0f766e 52%, #2563eb 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 76,
          borderRadius: 999,
          background: "rgba(255,255,255,0.12)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 116,
          top: 70,
          width: 280,
          height: 372,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        <div
          style={{
            width: 206,
            height: 206,
            borderRadius: 999,
            background: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 20px 40px rgba(15, 23, 42, 0.18)",
          }}
        >
          <div
            style={{
              width: 132,
              height: 132,
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
                left: 10,
                right: 10,
                bottom: 18,
                height: 24,
                borderRadius: 999,
                background: "#38bdf8",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 28,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "18px solid transparent",
                  borderRight: "18px solid transparent",
                  borderBottom: "30px solid #22c55e",
                }}
              />
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "16px solid transparent",
                  borderRight: "16px solid transparent",
                  borderBottom: "28px solid #16a34a",
                }}
              />
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "14px solid transparent",
                  borderRight: "14px solid transparent",
                  borderBottom: "24px solid #15803d",
                }}
              />
            </div>
            <div
              style={{
                position: "absolute",
                left: 18,
                right: 18,
                bottom: 34,
                height: 10,
                borderRadius: 999,
                background: "#86efac",
              }}
            />
          </div>
        </div>

        <div
          style={{
            width: 134,
            height: 134,
            marginTop: -34,
            transform: "rotate(45deg)",
            borderRadius: 30,
            background: "#f8fafc",
            boxShadow: "0 18px 30px rgba(15, 23, 42, 0.16)",
          }}
        />
      </div>
    </div>
  );
};

export const createPwaIconResponse = (size: number): ImageResponse => {
  return new ImageResponse(<PwaIcon />, {
    width: size,
    height: size,
  });
};
