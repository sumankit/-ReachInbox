"use client";

import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline";

const variantClasses: Record<Variant, string> = {
  primary: "rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300",
  secondary: "rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
  ghost: "rounded-lg text-slate-600 hover:bg-slate-100",
  // Pill button with a green outline — matches the Figma "Schedule" / "Send Later" / "Done" buttons.
  outline: "rounded-full border border-brand-500 text-brand-600 hover:bg-brand-50 disabled:opacity-50",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
