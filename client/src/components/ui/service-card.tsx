import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

// CVA for card variants
const cardVariants = cva(
  "relative flex flex-col justify-between w-full p-6 overflow-hidden rounded-2xl shadow-sm transition-all duration-300 ease-in-out group cursor-pointer select-none backdrop-blur-md border",
  {
    variants: {
      variant: {
        default:
          "bg-slate-900/85 text-card-foreground border-white/10 hover:border-indigo-500/50 hover:shadow-[0_12px_28px_-8px_rgba(0,0,0,0.55)]",
        red:
          "bg-gradient-to-br from-red-950/60 to-slate-900/90 text-white border-red-500/30 hover:border-red-400 hover:shadow-[0_12px_28px_-8px_rgba(239,68,68,0.25)]",
        blue:
          "bg-gradient-to-br from-blue-950/60 to-slate-900/90 text-white border-blue-500/30 hover:border-blue-400 hover:shadow-[0_12px_28px_-8px_rgba(59,130,246,0.25)]",
        purple:
          "bg-gradient-to-br from-purple-950/60 to-slate-900/90 text-white border-purple-500/30 hover:border-purple-400 hover:shadow-[0_12px_28px_-8px_rgba(168,85,247,0.25)]",
        amber:
          "bg-gradient-to-br from-amber-950/60 to-slate-900/90 text-white border-amber-500/30 hover:border-amber-400 hover:shadow-[0_12px_28px_-8px_rgba(245,158,11,0.25)]",
        emerald:
          "bg-gradient-to-br from-emerald-950/60 to-slate-900/90 text-white border-emerald-500/30 hover:border-emerald-400 hover:shadow-[0_12px_28px_-8px_rgba(16,185,129,0.25)]",
        cyan:
          "bg-gradient-to-br from-cyan-950/60 to-slate-900/90 text-white border-cyan-500/30 hover:border-cyan-400 hover:shadow-[0_12px_28px_-8px_rgba(6,182,212,0.25)]",
        gray:
          "bg-secondary/80 text-secondary-foreground border-white/10 hover:border-white/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ServiceCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /**
   * The main title of the card.
   */
  title: string;
  /**
   * Optional description text below the title.
   */
  description?: string;
  /**
   * The URL the card's link should point to.
   */
  href?: string;
  /**
   * The source URL for the decorative image.
   */
  imgSrc: string;
  /**
   * The alt text for the decorative image, for accessibility.
   */
  imgAlt: string;
  /**
   * Optional icon component to display in the header.
   */
  icon?: React.ReactNode;
  /**
   * Accent color for the icon container.
   */
  iconColor?: string;
  /**
   * Whether the card is currently selected in a selection group.
   */
  selected?: boolean;
  /**
   * Number of questions available in this category.
   */
  questionCount?: number;
  /**
   * Whether this category meets minimum question requirements to be played.
   */
  playable?: boolean;
  /**
   * Minimum questions required for the category to be playable.
   */
  minQuestionsRequired?: number;
  /**
   * Custom call-to-action label.
   */
  actionText?: string;
}

const ServiceCard = React.forwardRef<HTMLDivElement, ServiceCardProps>(
  (
    {
      className,
      variant,
      title,
      description,
      href,
      imgSrc,
      imgAlt,
      icon,
      iconColor = "#6366f1",
      selected = false,
      questionCount,
      playable = true,
      minQuestionsRequired = 5,
      actionText,
      onClick,
      ...props
    },
    ref
  ) => {
    const isPlayable =
      playable && (questionCount === undefined || questionCount >= minQuestionsRequired);

    // Animation variants for Framer Motion
    const cardAnimation = {
      hover: {
        scale: isPlayable ? 1.02 : 1,
        transition: { duration: 0.3 },
      },
    };

    const imageAnimation = {
      hover: {
        scale: isPlayable ? 1.08 : 1,
        rotate: isPlayable ? 3 : 0,
        x: isPlayable ? 6 : 0,
        transition: { duration: 0.4, ease: "easeInOut" },
      },
    };

    const arrowAnimation = {
      hover: {
        x: 5,
        transition: {
          duration: 0.3,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "reverse" as const,
        },
      },
    };

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isPlayable) {
        e.preventDefault();
        return;
      }
      if (onClick) {
        onClick(e);
      }
    };

    const labelText = actionText || (selected ? "SELECTED" : isPlayable ? "SELECT DOMAIN" : "UNAVAILABLE");

    return (
      <motion.div
        className={cn(
          cardVariants({ variant, className }),
          selected &&
            "border-indigo-500 ring-2 ring-indigo-500/70 shadow-[0_0_28px_rgba(99,102,241,0.35)]",
          !isPlayable && "opacity-60 grayscale-[35%] cursor-not-allowed hover:shadow-none"
        )}
        ref={ref}
        variants={cardAnimation}
        whileHover="hover"
        onClick={handleClick}
        {...(props as any)}
      >
        {/* Top Header: Icon Container + Badges */}
        <div className="relative z-10 flex items-center justify-between w-full mb-4">
          {icon ? (
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: `${iconColor}18`,
                borderColor: `${iconColor}40`,
                color: iconColor,
              }}
            >
              {icon}
            </div>
          ) : (
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ArrowRight className="w-5 h-5" />
            </div>
          )}

          <div className="flex items-center gap-2">
            {questionCount !== undefined && (
              isPlayable ? (
                <span className="text-xs font-semibold text-slate-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                  {questionCount} questions
                </span>
              ) : (
                <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {questionCount === 0 ? "No questions" : `${questionCount}/${minQuestionsRequired}`}
                </span>
              )
            )}

            {selected && isPlayable && (
              <span className="text-xs font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-1 rounded-full inline-flex items-center gap-1 shadow-sm">
                <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                Selected
              </span>
            )}
          </div>
        </div>

        {/* Middle Content: Title & Description */}
        <div className="relative z-10 flex flex-col flex-1 justify-between">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-white mb-1.5 leading-snug">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-slate-400 leading-relaxed max-w-[85%] line-clamp-2">
                {description}
              </p>
            )}
          </div>

          {/* Action Link / Button */}
          <div className="mt-5 pt-2 flex items-center text-xs font-bold tracking-wider uppercase text-indigo-400 group-hover:text-indigo-300">
            {href ? (
              <a
                href={isPlayable ? href : undefined}
                aria-label={`Learn more about ${title}`}
                className="inline-flex items-center gap-1.5 group-hover:underline"
                onClick={(e) => {
                  if (!isPlayable) e.preventDefault();
                }}
              >
                <span>{labelText}</span>
                <motion.div variants={arrowAnimation}>
                  <ArrowRight className="h-3.5 w-3.5" />
                </motion.div>
              </a>
            ) : (
              <div className="inline-flex items-center gap-1.5">
                <span>{labelText}</span>
                <motion.div variants={arrowAnimation}>
                  <ArrowRight className="h-3.5 w-3.5" />
                </motion.div>
              </div>
            )}
          </div>
        </div>

        {/* Decorative Background Image with Shadow and Subtle Hover Motion */}
        <motion.img
          src={imgSrc}
          alt={imgAlt}
          className="absolute -right-3 -bottom-3 w-40 h-40 object-cover rounded-2xl opacity-80 group-hover:opacity-100 shadow-2xl transition-all duration-300 pointer-events-none border border-white/10"
          variants={imageAnimation}
          loading="lazy"
        />

        {/* Subtle Radial Gradient to preserve text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-transparent/30 pointer-events-none" />
      </motion.div>
    );
  }
);
ServiceCard.displayName = "ServiceCard";

export { ServiceCard };
