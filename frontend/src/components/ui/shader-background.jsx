import React from "react";
import { MeshGradient } from "@paper-design/shaders-react";

/**
 * ShaderBackground - Uses @paper-design/shaders-react MeshGradient
 * Renders a dynamic mesh gradient background with customizable colors
 */
export default function ShaderBackground({ speed = 1.0 }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        background: "#000000",
        overflow: "hidden",
      }}
    >
      <MeshGradient
        style={{
          width: "100%",
          height: "100%",
        }}
        colors={["#000000", "#1a1a1a", "#333333", "#ffffff"]}
        speed={speed}
      />
    </div>
  );
}
