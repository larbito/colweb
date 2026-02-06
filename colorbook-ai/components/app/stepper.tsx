"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface Step {
  id: number;
  name: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  className?: string;
}

/**
 * Stepper - Clean sticky stepper for multi-step flows
 * Linear/Vercel style: minimal, horizontal, clear status indicators
 */
export function Stepper({ steps, currentStep, onStepClick, className }: StepperProps) {
  return (
    <div className={cn(
      "sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border py-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10",
      className
    )}>
      <nav aria-label="Progress">
        <ol className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {steps.map((step, index) => {
            const isComplete = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isClickable = onStepClick && (isComplete || step.id <= currentStep);
            
            return (
              <li key={step.id} className="flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isCurrent && "bg-foreground text-background",
                    isComplete && "text-foreground hover:bg-muted",
                    !isCurrent && !isComplete && "text-muted-foreground",
                    isClickable && !isCurrent && "hover:bg-muted cursor-pointer",
                    !isClickable && "cursor-default"
                  )}
                >
                  {/* Step indicator */}
                  <span className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold shrink-0",
                    isCurrent && "bg-background text-foreground",
                    isComplete && "bg-green-500 text-white",
                    !isCurrent && !isComplete && "bg-muted text-muted-foreground"
                  )}>
                    {isComplete ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      step.id
                    )}
                  </span>
                  
                  {/* Step name */}
                  <span className="whitespace-nowrap">{step.name}</span>
                </button>
                
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className={cn(
                    "w-8 h-px mx-1 shrink-0",
                    isComplete ? "bg-foreground/30" : "bg-border"
                  )} />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

/**
 * StepContent - Wrapper for step content with consistent styling
 */
interface StepContentProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}

export function StepContent({ children, title, description, className }: StepContentProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

