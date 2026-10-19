import React from "react";
import { motion } from "framer-motion";
import { MatrixLoader, Shimmer } from "./ui/transitions";
import wordmarkDark from "../assets/wordmark-dark.png";
import wordmarkLight from "../assets/wordmark-light.png";

interface AppLoadingScreenProps {
  isDark?: boolean;
}

export default function AppLoadingScreen({ isDark = true }: AppLoadingScreenProps) {
  const ink = isDark ? "#FFFFFF" : "#0F1115";
  const sub = "#6B7280";
  const logoSrc = isDark ? wordmarkDark : wordmarkLight;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: isDark
          ? "radial-gradient(ellipse 70% 55% at 50% 38%, #1d2229 0%, #0F1115 70%)"
          : "radial-gradient(ellipse 70% 55% at 50% 38%, #FFFFFF 0%, #F5F6F8 70%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        fontFamily: "'Inter', sans-serif",
        overflow: "hidden",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          // The loader renders before the theme class settles, so its tokens follow isDark.
          ["--matrix-base" as string]: isDark ? "rgba(255,255,255,0.14)" : "rgba(15,17,21,0.14)",
          ["--matrix-active" as string]: ink,
          ["--shimmer-base" as string]: sub,
          ["--shimmer-highlight" as string]: ink,
        }}
      >
        <motion.img
          src={logoSrc}
          alt="Waypoint"
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: 260,
            height: "auto",
            objectFit: "contain",
            filter: isDark ? "drop-shadow(0 0 28px rgba(255,255,255,0.12))" : "none",
          }}
        />

        <div
          style={{
            fontSize: 10.5,
            color: sub,
            letterSpacing: "0.42em",
            fontWeight: 500,
            textTransform: "uppercase",
            marginBottom: 26,
          }}
        >
          By Next Technology
        </div>

        <MatrixLoader variant="orbit" className="wp-matrix-lg" />

        <div style={{ fontSize: 12.5, color: sub, fontWeight: 500, letterSpacing: "0.02em" }}>
          <Shimmer>Syncing your workspace…</Shimmer>
        </div>
      </motion.div>
    </div>
  );
}
