"use client";

import { useEffect, useRef, useState } from "react";

export default function VouchIdentitySVG() {
  const [verified, setVerified] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanY, setScanY] = useState(0);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Auto-trigger scan loop
    const loop = setInterval(() => {
      setVerified(false);
      setScanning(true);
      setScanY(0);
      startTimeRef.current = performance.now();

      const animate = (now: number) => {
        const elapsed = now - (startTimeRef.current ?? 0);
        const duration = 1800;
        const progress = Math.min(elapsed / duration, 1);
        setScanY(progress * 100);

        if (progress < 1) {
          animRef.current = requestAnimationFrame(animate);
        } else {
          setScanning(false);
          setVerified(true);
        }
      };

      animRef.current = requestAnimationFrame(animate);
    }, 3500);

    // Kick off immediately
    setScanning(true);
    startTimeRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - (startTimeRef.current ?? 0);
      const duration = 1800;
      const progress = Math.min(elapsed / duration, 1);
      setScanY(progress * 100);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setScanning(false);
        setVerified(true);
      }
    };
    animRef.current = requestAnimationFrame(animate);

    return () => {
      clearInterval(loop);
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, []);

  const accent = "#00ff88";
  const accentDim = "#00cc6a";
  const accentGlow = "rgba(0,255,136,0.18)";
  const bg = "transparent";
  const card = "#111318";
  const border = "#1e2028";
  const textPrimary = "#f0f0f0";
  const textMuted = "#555";

  return (
    <div
      style={{
        background: bg,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'JetBrains Mono', monospace",
      }}
      className="w-full h-auto object-contain grayscale transition-[filter] duration-300 group-hover:grayscale-0"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Syne:wght@700;800&display=swap');

        @keyframes floatMain {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(0.5deg); }
        }
        @keyframes floatOrbit1 {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-8px) translateX(4px); }
          66% { transform: translateY(4px) translateX(-3px); }
        }
        @keyframes floatOrbit2 {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          40% { transform: translateY(6px) translateX(-5px); }
          75% { transform: translateY(-5px) translateX(3px); }
        }
        @keyframes floatOrbit3 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; r: 90; }
          50% { opacity: 0.8; r: 100; }
        }
        @keyframes pulseRing {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes dashRotate {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -60; }
        }
        @keyframes blink {
          0%, 90%, 100% { opacity: 1; }
          95% { opacity: 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { stop-color: #00ff88; stop-opacity: 0; }
          50% { stop-color: #00ff88; stop-opacity: 0.3; }
          100% { stop-color: #00ff88; stop-opacity: 0; }
        }
        @keyframes orbitRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes nodesPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        .float-main { animation: floatMain 4s ease-in-out infinite; }
        .float-1 { animation: floatOrbit1 5s ease-in-out infinite; }
        .float-2 { animation: floatOrbit2 6s ease-in-out infinite 0.5s; }
        .float-3 { animation: floatOrbit3 4.5s ease-in-out infinite 1s; }
        .pulse-ring { animation: pulseRing 2s ease-out infinite; }
        .pulse-ring-2 { animation: pulseRing 2s ease-out infinite 0.7s; }
        .dash-rotate { animation: dashRotate 3s linear infinite; }
        .verified-badge {
          animation: fadeInUp 0.4s ease-out forwards;
        }
      `}</style>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "32px",
        }}
      >
        {/* Main SVG Illustration */}
        <svg
          width="420"
          height="420"
          viewBox="0 0 420 420"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Radial glow behind main shield */}
            <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
              <stop
                offset="0%"
                stopColor={accent}
                stopOpacity={verified ? "0.12" : "0.06"}
                style={{ transition: "stop-opacity 0.8s ease" }}
              />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </radialGradient>

            {/* Shield face gradient */}
            <linearGradient id="shieldFace" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a1d24" />
              <stop offset="100%" stopColor="#0d0f14" />
            </linearGradient>

            {/* Shield left face */}
            <linearGradient id="shieldLeft" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0a0c10" />
              <stop offset="100%" stopColor="#111318" />
            </linearGradient>

            {/* Shield right face */}
            <linearGradient id="shieldRight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#13151c" />
              <stop offset="100%" stopColor="#0f1117" />
            </linearGradient>

            {/* Scan line gradient */}
            <linearGradient id="scanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accent} stopOpacity="0" />
              <stop offset="50%" stopColor={accent} stopOpacity="0.6" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>

            {/* Clip path for scan line inside shield */}
            <clipPath id="shieldClip">
              <path d="M240 100 L310 130 L310 200 Q310 260 240 300 Q170 260 170 200 L170 130 Z" />
            </clipPath>

            {/* Card gradient */}
            <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a1d26" />
              <stop offset="100%" stopColor="#0e1018" />
            </linearGradient>

            {/* Fingerprint glow */}
            <radialGradient id="fpGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={accent} stopOpacity="0.2" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </radialGradient>

            {/* Dot grid pattern */}
            <pattern
              id="dotGrid"
              x="0"
              y="0"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="0.8" fill="#ffffff" fillOpacity="0.04" />
            </pattern>
          </defs>

          {/* Dot grid background */}
          <rect width="480" height="480" fill="url(#dotGrid)" />

          {/* Background glow orb */}
          <circle cx="240" cy="230" r="140" fill="url(#bgGlow)" />

          {/* ── ORBIT RINGS ── */}
          {/* Outer dashed orbit */}
          <circle
            cx="240"
            cy="230"
            r="155"
            stroke={border}
            strokeWidth="1"
            strokeDasharray="4 8"
            fill="none"
            className="dash-rotate"
            style={{ transformOrigin: "240px 230px" }}
          />
          {/* Inner dashed orbit */}
          <circle
            cx="240"
            cy="230"
            r="115"
            stroke={border}
            strokeWidth="1"
            strokeDasharray="3 10"
            fill="none"
            style={{
              transformOrigin: "240px 230px",
              animation: "dashRotate 5s linear infinite reverse",
            }}
          />

          {/* ── PULSE RINGS (verified state) ── */}
          {verified && (
            <>
              <circle
                cx="240"
                cy="220"
                r="85"
                stroke={accent}
                strokeWidth="1.5"
                fill="none"
                className="pulse-ring"
                style={{ transformOrigin: "240px 220px" }}
              />
              <circle
                cx="240"
                cy="220"
                r="85"
                stroke={accent}
                strokeWidth="1"
                fill="none"
                className="pulse-ring-2"
                style={{ transformOrigin: "240px 220px" }}
              />
            </>
          )}

          {/* ── FLOATING ORBIT OBJECTS ── */}

          {/* Top-right: Isometric mini cube */}
          <g className="float-1" style={{ transformOrigin: "355px 120px" }}>
            {/* Top face */}
            <polygon
              points="355,100 375,110 355,120 335,110"
              fill="#1a1d26"
              stroke={border}
              strokeWidth="1"
            />
            {/* Left face */}
            <polygon
              points="335,110 355,120 355,140 335,130"
              fill="#0d0f14"
              stroke={border}
              strokeWidth="1"
            />
            {/* Right face */}
            <polygon
              points="375,110 355,120 355,140 375,130"
              fill="#13151e"
              stroke={border}
              strokeWidth="1"
            />
            {/* Top face accent edge */}
            <polyline
              points="335,110 355,100 375,110"
              stroke={border}
              strokeWidth="0.5"
              fill="none"
            />
          </g>

          {/* Bottom-left: Isometric hexagon */}
          <g className="float-2" style={{ transformOrigin: "95px 310px" }}>
            <polygon
              points="95,290 115,300 115,320 95,330 75,320 75,300"
              fill="#111318"
              stroke={border}
              strokeWidth="1.5"
            />
            <polygon
              points="95,290 115,300 115,320 95,330 75,320 75,300"
              fill="none"
              stroke={verified ? accent : border}
              strokeWidth="0.5"
              style={{ transition: "stroke 0.8s ease" }}
            />
            {/* Inner hex */}
            <polygon
              points="95,297 109,304 109,318 95,325 81,318 81,304"
              fill="none"
              stroke={border}
              strokeWidth="0.5"
            />
          </g>

          {/* Top-left: Floating diamond */}
          <g className="float-3" style={{ transformOrigin: "100px 150px" }}>
            {/* Diamond isometric top */}
            <polygon
              points="100,130 118,140 100,150 82,140"
              fill="#161820"
              stroke={border}
              strokeWidth="1"
            />
            {/* Diamond left */}
            <polygon
              points="82,140 100,150 100,168 82,158"
              fill="#0c0e12"
              stroke={border}
              strokeWidth="1"
            />
            {/* Diamond right */}
            <polygon
              points="118,140 100,150 100,168 118,158"
              fill="#12141c"
              stroke={border}
              strokeWidth="1"
            />
          </g>

          {/* Bottom-right: Small accent diamond */}
          <g
            className="float-1"
            style={{ transformOrigin: "375px 340px", animationDelay: "1.5s" }}
          >
            <polygon
              points="375,325 388,332 375,340 362,332"
              fill={verified ? "#001a0d" : "#111318"}
              stroke={verified ? accentDim : border}
              strokeWidth="1"
              style={{ transition: "all 0.8s ease" }}
            />
            <polygon
              points="362,332 375,340 375,354 362,346"
              fill={verified ? "#000f08" : "#0a0c10"}
              stroke={verified ? accentDim : border}
              strokeWidth="1"
              style={{ transition: "all 0.8s ease" }}
            />
            <polygon
              points="388,332 375,340 375,354 388,346"
              fill={verified ? "#001205" : "#0e1016"}
              stroke={verified ? accentDim : border}
              strokeWidth="1"
              style={{ transition: "all 0.8s ease" }}
            />
          </g>

          {/* ── MAIN SHIELD ── */}
          <g className="float-main" style={{ transformOrigin: "240px 220px" }}>
            {/* Shield drop shadow */}
            <ellipse
              cx="240"
              cy="315"
              rx="55"
              ry="8"
              fill="#000000"
              fillOpacity="0.5"
            />

            {/* Shield isometric — left face */}
            <path
              d="M170 155 L240 120 L240 300 Q170 265 170 200 Z"
              fill="url(#shieldLeft)"
              stroke={verified ? accentDim : border}
              strokeWidth="1"
              style={{ transition: "stroke 0.8s ease" }}
            />

            {/* Shield isometric — right face */}
            <path
              d="M310 155 L240 120 L240 300 Q310 265 310 200 Z"
              fill="url(#shieldRight)"
              stroke={verified ? accentDim : border}
              strokeWidth="1"
              style={{ transition: "stroke 0.8s ease" }}
            />

            {/* Shield front face */}
            <path
              d="M240 115 L315 148 L315 205 Q315 268 240 308 Q165 268 165 205 L165 148 Z"
              fill="url(#shieldFace)"
              stroke={verified ? accent : border}
              strokeWidth={verified ? "1.5" : "1"}
              style={{ transition: "all 0.8s ease" }}
            />

            {/* Shield inner border */}
            <path
              d="M240 128 L305 157 L305 205 Q305 262 240 298 Q175 262 175 205 L175 157 Z"
              fill="none"
              stroke={verified ? accent : "#1e2028"}
              strokeWidth="0.8"
              strokeOpacity={verified ? "0.5" : "0.4"}
              style={{ transition: "all 0.8s ease" }}
            />

            {/* Shield glow fill when verified */}
            <path
              d="M240 115 L315 148 L315 205 Q315 268 240 308 Q165 268 165 205 L165 148 Z"
              fill={accent}
              fillOpacity={verified ? "0.04" : "0"}
              style={{ transition: "fill-opacity 0.8s ease" }}
            />

            {/* ── SCAN LINE ── */}
            {scanning && (
              <g clipPath="url(#shieldClip)">
                <rect
                  x="165"
                  y={115 + (scanY / 100) * 193 - 20}
                  width="150"
                  height="40"
                  fill="url(#scanGrad)"
                  opacity="0.7"
                />
                {/* Scan line solid */}
                <line
                  x1="168"
                  y1={115 + (scanY / 100) * 193}
                  x2="312"
                  y2={115 + (scanY / 100) * 193}
                  stroke={accent}
                  strokeWidth="1"
                  strokeOpacity="0.9"
                />
              </g>
            )}

            {/* ── FINGERPRINT INSIDE SHIELD ── */}
            <g>
              {/* Fingerprint glow bg */}
              <circle cx="240" cy="215" r="38" fill="url(#fpGlow)" />

              {/* Fingerprint arcs — 6 concentric arcs */}
              {[
                { r: 8, d: "M228,215 Q240,203 252,215 Q240,227 228,215" },
                { r: 15, d: "M222,215 Q240,197 258,215 Q240,233 222,215" },
                { r: 22, d: "M216,215 Q240,191 264,215 Q240,239 216,215" },
                { r: 28, d: "M210,215 Q240,185 270,215 Q240,245 210,215" },
                { r: 34, d: "M205,215 Q240,179 275,215 Q240,251 205,215" },
              ].map((arc, i) => (
                <path
                  key={i}
                  d={arc.d}
                  fill="none"
                  stroke={verified ? accent : "#2a2d38"}
                  strokeWidth={verified ? "1.2" : "1"}
                  strokeOpacity={verified ? 1 - i * 0.12 : 0.6 - i * 0.08}
                  style={{ transition: `all 0.8s ease ${i * 0.06}s` }}
                />
              ))}

              {/* Center dot */}
              <circle
                cx="240"
                cy="215"
                r="2.5"
                fill={verified ? accent : "#3a3d4a"}
                style={{ transition: "fill 0.8s ease" }}
              />

              {/* Scan corner brackets */}
              {/* TL */}
              <path
                d="M210,190 L210,183 L217,183"
                stroke={verified ? accent : "#2a2d38"}
                strokeWidth="1.5"
                fill="none"
                style={{ transition: "stroke 0.8s ease" }}
              />
              {/* TR */}
              <path
                d="M270,190 L270,183 L263,183"
                stroke={verified ? accent : "#2a2d38"}
                strokeWidth="1.5"
                fill="none"
                style={{ transition: "stroke 0.8s ease" }}
              />
              {/* BL */}
              <path
                d="M210,240 L210,247 L217,247"
                stroke={verified ? accent : "#2a2d38"}
                strokeWidth="1.5"
                fill="none"
                style={{ transition: "stroke 0.8s ease" }}
              />
              {/* BR */}
              <path
                d="M270,240 L270,247 L263,247"
                stroke={verified ? accent : "#2a2d38"}
                strokeWidth="1.5"
                fill="none"
                style={{ transition: "stroke 0.8s ease" }}
              />
            </g>

            {/* ── VERIFIED CHECKMARK ── */}
            {verified && (
              <g className="verified-badge">
                <circle
                  cx="295"
                  cy="148"
                  r="14"
                  fill="#001a0d"
                  stroke={accent}
                  strokeWidth="1.5"
                />
                <polyline
                  points="288,148 293,154 303,143"
                  stroke={accent}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </g>
            )}
          </g>

          {/* ── CONNECTOR LINES to orbit objects ── */}
          <line
            x1="310"
            y1="165"
            x2="340"
            y2="130"
            stroke={border}
            strokeWidth="0.8"
            strokeDasharray="3 5"
            strokeOpacity="0.6"
          />
          <line
            x1="170"
            y1="260"
            x2="115"
            y2="310"
            stroke={border}
            strokeWidth="0.8"
            strokeDasharray="3 5"
            strokeOpacity="0.6"
          />
          <line
            x1="170"
            y1="175"
            x2="110"
            y2="155"
            stroke={border}
            strokeWidth="0.8"
            strokeDasharray="3 5"
            strokeOpacity="0.6"
          />
          <line
            x1="310"
            y1="270"
            x2="365"
            y2="335"
            stroke={verified ? accentDim : border}
            strokeWidth="0.8"
            strokeDasharray="3 5"
            strokeOpacity="0.6"
            style={{ transition: "stroke 0.8s ease" }}
          />

          {/* ── STATUS BADGE ── */}
          <g>
            <rect
              x="155"
              y="326"
              width="170"
              height="28"
              rx="14"
              fill={card}
              stroke={verified ? accent : border}
              strokeWidth="1"
              style={{ transition: "all 0.8s ease" }}
            />
            <circle
              cx="176"
              cy="340"
              r="5"
              fill={verified ? accent : "#333"}
              style={{ transition: "fill 0.8s ease" }}
            />
            <text
              x="188"
              y="345"
              fill={verified ? accent : textMuted}
              fontSize="11"
              fontFamily="'JetBrains Mono', monospace"
              fontWeight="500"
              style={{ transition: "fill 0.8s ease" }}
            >
              {verified
                ? "identity_verified"
                : scanning
                  ? "scanning..."
                  : "pending"}
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
