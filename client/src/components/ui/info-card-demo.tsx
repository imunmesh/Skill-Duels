import React, { useState } from "react";
import InfoCard from "@/components/ui/info-card";
import { Layers, Brain, Code, Compass, Globe } from "lucide-react";

export default function InfoCardDemo() {
  const [selected, setSelected] = useState<string>("dsa");

  const categories = [
    {
      id: "dsa",
      title: "Data Structures &\nAlgorithms",
      description: "Arrays, trees, graphs, sorting, searching, and asymptotic Big-O analysis.",
      icon: <Layers size={22} strokeWidth={2.2} />,
      iconColor: "#a855f7",
    },
    {
      id: "logical",
      title: "Logical Reasoning",
      description: "Sequences, patterns, deductions, syllogisms, and critical reasoning.",
      icon: <Brain size={22} strokeWidth={2.2} />,
      iconColor: "#f59e0b",
    },
    {
      id: "ml",
      title: "Machine learning",
      description: "Models",
      icon: <Code size={22} strokeWidth={2.2} />,
      iconColor: "#6366f1",
    },
    {
      id: "aptitude",
      title: "Quantitative Aptitude",
      description: "Arithmetic, speed, distance, time, percentages, and problem solving.",
      icon: <Compass size={22} strokeWidth={2.2} />,
      iconColor: "#10b981",
    },
    {
      id: "technical",
      title: "Technical & CS",
      description: "Core computer science fundamentals, OS, memory, and programming concepts.",
      icon: <Code size={22} strokeWidth={2.2} />,
      iconColor: "#6366f1",
    },
    {
      id: "web-dev",
      title: "Web Development",
      description: "HTML5, CSS3, modern JavaScript, browser DOM, and HTTP protocols.",
      icon: <Globe size={22} strokeWidth={2.2} />,
      iconColor: "#06b6d4",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0b101b", padding: "40px 20px" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {categories.map((cat) => (
            <InfoCard
              key={cat.id}
              title={cat.title}
              description={cat.description}
              icon={cat.icon}
              iconColor={cat.iconColor}
              selected={selected === cat.id}
              onClick={() => setSelected(cat.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
