"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  id: number;
  label: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  canNavigateTo?: (step: number) => boolean;
  className?: string;
  compact?: boolean;
}

export function StepIndicator({
  steps,
  currentStep,
  onStepClick,
  canNavigateTo,
  className = "",
  compact = false,
}: StepIndicatorProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className={cn(
        "flex items-center justify-between",
        compact ? "gap-2" : "gap-0"
      )}>
        {steps.map((step, idx) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const canClick = canNavigateTo ? canNavigateTo(step.id) : true;
          const isClickable = onStepClick && canClick;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              {/* Step circle and label */}
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                className={cn(
                  "flex flex-col items-center transition-all",
                  isClickable ? "cursor-pointer" : "cursor-not-allowed"
                )}
              >
                {/* Circle */}
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full font-medium transition-all",
                    compact ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm mb-2",
                    isActive && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    isCompleted && "bg-green-500 text-white",
                    !isActive && !isCompleted && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className={cn(compact ? "h-4 w-4" : "h-5 w-5")} /> : step.id}
                </div>
                
                {/* Labels - hide on compact or mobile */}
                {!compact && (
                  <div className="hidden sm:block text-center">
                    <span className={cn(
                      "text-xs font-medium",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                    {step.description && (
                      <span className="block text-[10px] text-muted-foreground">
                        {step.description}
                      </span>
                    )}
                  </div>
                )}
              </button>

              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2",
                    currentStep > step.id ? "bg-green-500" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

