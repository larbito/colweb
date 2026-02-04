"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type Step = 1 | 2 | 3 | 4 | 5;

interface StepConfig {
  step: Step;
  label: string;
  description?: string;
}

interface StepIndicatorProps {
  currentStep: Step;
  steps: StepConfig[];
  onStepClick?: (step: Step) => void;
  canNavigateTo?: (step: Step) => boolean;
  variant?: "default" | "slim" | "pills";
  className?: string;
}

/**
 * StepIndicator - Slim progress indicator at top of wizard
 * 
 * Design system:
 * - 12px radius
 * - Consistent spacing
 * - "slim" variant for top-of-page use
 */
export function StepIndicator({
  currentStep,
  steps,
  onStepClick,
  canNavigateTo,
  variant = "slim",
  className,
}: StepIndicatorProps) {
  const handleClick = (step: Step) => {
    const canNavigate = canNavigateTo ? canNavigateTo(step) : true;
    if (canNavigate && onStepClick) {
      onStepClick(step);
    }
  };

  // Slim variant - default for dashboard pages
  if (variant === "slim") {
    return (
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-2xl bg-muted/50 overflow-x-auto no-scrollbar",
        className
      )}>
        {steps.map((s, idx) => {
          const isActive = currentStep === s.step;
          const isCompleted = currentStep > s.step;
          const canClick = canNavigateTo ? canNavigateTo(s.step) : true;

          return (
            <button
              key={s.step}
              onClick={() => handleClick(s.step)}
              disabled={!canClick}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                isActive && "bg-primary text-primary-foreground shadow-sm",
                isCompleted && !isActive && "text-success hover:bg-success/10",
                !isActive && !isCompleted && "text-muted-foreground hover:bg-muted",
                canClick ? "cursor-pointer" : "cursor-not-allowed opacity-50"
              )}
            >
              {/* Step number/check */}
              <span className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold",
                isActive && "bg-primary-foreground/20",
                isCompleted && "bg-success/20",
                !isActive && !isCompleted && "bg-muted-foreground/20"
              )}>
                {isCompleted ? <Check className="h-3 w-3" /> : s.step}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Pills variant
  if (variant === "pills") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {steps.map((s) => {
          const isActive = currentStep === s.step;
          const isCompleted = currentStep > s.step;
          const canClick = canNavigateTo ? canNavigateTo(s.step) : true;

          return (
            <button
              key={s.step}
              onClick={() => handleClick(s.step)}
              disabled={!canClick}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                isActive && "bg-primary text-primary-foreground shadow-md",
                isCompleted && !isActive && "bg-success/10 text-success",
                !isActive && !isCompleted && "bg-muted text-muted-foreground",
                canClick ? "cursor-pointer hover:opacity-90" : "cursor-not-allowed opacity-50"
              )}
            >
              {isCompleted ? (
                <Check className="h-4 w-4" />
              ) : (
                <span className="h-4 w-4 text-center">{s.step}</span>
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Default variant - horizontal with circles
  return (
    <div className={cn("flex items-center justify-center", className)}>
      {steps.map((s, idx) => {
        const isActive = currentStep === s.step;
        const isCompleted = currentStep > s.step;
        const canClick = canNavigateTo ? canNavigateTo(s.step) : true;

        return (
          <div key={s.step} className="flex items-center">
            <button
              onClick={() => handleClick(s.step)}
              disabled={!canClick}
              className={cn(
                "flex flex-col items-center gap-2 group",
                canClick ? "cursor-pointer" : "cursor-not-allowed"
              )}
            >
              {/* Step circle */}
              <div
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold transition-all",
                  isActive && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  isCompleted && "bg-success text-success-foreground",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground",
                  canClick && !isActive && "group-hover:bg-muted/80"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  s.step
                )}
              </div>
              
              {/* Label */}
              <div className="text-center">
                <p className={cn(
                  "text-xs font-medium transition-colors",
                  isActive && "text-foreground",
                  isCompleted && "text-success",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}>
                  {s.label}
                </p>
                {s.description && (
                  <p className="text-[10px] text-muted-foreground max-w-[80px] truncate">
                    {s.description}
                  </p>
                )}
              </div>
            </button>

            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-12 mx-4 transition-colors",
                  currentStep > s.step ? "bg-success" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Vertical step list for sidebar
interface VerticalStepsProps {
  currentStep: Step;
  steps: StepConfig[];
  onStepClick?: (step: Step) => void;
  canNavigateTo?: (step: Step) => boolean;
  className?: string;
}

export function VerticalSteps({
  currentStep,
  steps,
  onStepClick,
  canNavigateTo,
  className,
}: VerticalStepsProps) {
  const handleClick = (step: Step) => {
    const canNavigate = canNavigateTo ? canNavigateTo(step) : true;
    if (canNavigate && onStepClick) {
      onStepClick(step);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {steps.map((s, idx) => {
        const isActive = currentStep === s.step;
        const isCompleted = currentStep > s.step;
        const canClick = canNavigateTo ? canNavigateTo(s.step) : true;

        return (
          <div key={s.step} className="flex items-start gap-3">
            {/* Line connector */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-all",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && "bg-success text-success-foreground",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : s.step}
              </div>
              {idx < steps.length - 1 && (
                <div className={cn(
                  "w-0.5 h-8 my-1",
                  isCompleted ? "bg-success" : "bg-muted"
                )} />
              )}
            </div>

            {/* Content */}
            <button
              onClick={() => handleClick(s.step)}
              disabled={!canClick}
              className={cn(
                "flex-1 text-left pt-1",
                canClick ? "cursor-pointer" : "cursor-not-allowed opacity-50"
              )}
            >
              <p className={cn(
                "text-sm font-medium",
                isActive && "text-foreground",
                isCompleted && "text-foreground",
                !isActive && !isCompleted && "text-muted-foreground"
              )}>
                {s.label}
              </p>
              {s.description && (
                <p className="text-xs text-muted-foreground">
                  {s.description}
                </p>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
