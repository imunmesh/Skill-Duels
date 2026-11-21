"use client";

import React, { useEffect, useRef, useState } from "react";

export interface SpringConfig {
  damping?: number;
  stiffness?: number;
  mass?: number;
  restDelta?: number;
}

export interface SmoothCursorProps {
  cursor?: React.ReactNode;
  springConfig?: SpringConfig;
  className?: string;
  style?: React.CSSProperties;
}

const DefaultCursorSVG = () => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: "drop-shadow(0 2px 8px rgba(0, 0, 0, 0.45))" }}
  >
    <path
      d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36Z"
      fill="#ffffff"
      stroke="#1e293b"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export function SmoothCursor({
  cursor = <DefaultCursorSVG />,
  springConfig = {},
  className = "",
  style = {},
}: SmoothCursorProps) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);

  // Position and velocity refs
  const mousePos = useRef({ x: -100, y: -100 });
  const currentPos = useRef({ x: -100, y: -100 });
  const velocity = useRef({ x: 0, y: 0 });
  const rotation = useRef(0);

  const {
    damping = 0.72,
    stiffness = 0.18,
  } = springConfig;

  useEffect(() => {
    // Detect touch-only mobile devices
    const isTouch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia?.("(pointer: coarse)").matches);

    if (isTouch) {
      setIsTouchDevice(true);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    let rafId: number;

    const animate = () => {
      // Spring physics
      const dx = mousePos.current.x - currentPos.current.x;
      const dy = mousePos.current.y - currentPos.current.y;

      velocity.current.x = velocity.current.x * damping + dx * stiffness;
      velocity.current.y = velocity.current.y * damping + dy * stiffness;

      currentPos.current.x += velocity.current.x;
      currentPos.current.y += velocity.current.y;

      // Slight rotation based on speed and direction
      const speed = Math.sqrt(
        velocity.current.x * velocity.current.x + velocity.current.y * velocity.current.y
      );

      if (speed > 1) {
        const targetAngle = (Math.atan2(velocity.current.y, velocity.current.x) * 180) / Math.PI;
        // Dampen rotation angle for a subtle dynamic tilt
        rotation.current += ((targetAngle - 45) * 0.15 - rotation.current) * 0.2;
      } else {
        rotation.current += (0 - rotation.current) * 0.1;
      }

      if (cursorRef.current) {
        const scale = isClicking ? 0.85 : 1;
        cursorRef.current.style.transform = `translate3d(${currentPos.current.x}px, ${currentPos.current.y}px, 0) rotate(${rotation.current}deg) scale(${scale})`;
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      cancelAnimationFrame(rafId);
    };
  }, [damping, stiffness, isClicking, isVisible]);

  if (isTouchDevice) return null;

  return (
    <div
      ref={cursorRef}
      className={`fixed top-0 left-0 pointer-events-none z-[99999] transition-opacity duration-150 ${
        isVisible ? "opacity-100" : "opacity-0"
      } ${className}`}
      style={{
        transform: "translate3d(-100px, -100px, 0)",
        willChange: "transform",
        ...style,
      }}
      aria-hidden="true"
    >
      {cursor}
    </div>
  );
}

export default SmoothCursor;
