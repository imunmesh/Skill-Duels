import React from "react";
import { ServiceCard } from "@/components/ui/service-card";

const Demo = () => {
  const services = [
    {
      title: "Gamification Marketing",
      href: "/services/gamification",
      imgSrc:
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&auto=format&fit=crop&q=80",
      imgAlt: "Gaming and controller illustration",
      variant: "red" as const,
    },
    {
      title: "Graphic Design",
      href: "/services/design",
      imgSrc:
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80",
      imgAlt: "Abstract graphic design waves",
      variant: "default" as const,
    },
    {
      title: "Analytics and Tracking",
      href: "/services/analytics",
      imgSrc:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&auto=format&fit=crop&q=80",
      imgAlt: "Data analytics dashboards and charts",
      variant: "gray" as const,
    },
    {
      title: "Content Creation",
      href: "/services/content",
      imgSrc:
        "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&auto=format&fit=crop&q=80",
      imgAlt: "Notebook and workspace illustration",
      variant: "blue" as const,
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {services.map((service) => (
          <ServiceCard
            key={service.title}
            title={service.title}
            href={service.href}
            imgSrc={service.imgSrc}
            imgAlt={service.imgAlt}
            variant={service.variant}
            className="min-h-[180px]"
          />
        ))}
      </div>
    </div>
  );
};

export default Demo;
