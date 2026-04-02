# Phase 3B: Dashboard UI, Share Links & Notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the web dashboard UI with project workspace, AI chat panel, export functionality, share links for client review, and team management.

**Architecture:** Next.js App Router with React Server Components for data fetching, Client Components for interactive elements (chat, preview). Tailwind CSS for styling. API routes wrap `@typeset-ai/core` functions. All interactive state lives in Client Components; data loading lives in Server Components.

**Tech Stack:** Next.js 14+, React 18+, Tailwind CSS, `@typeset-ai/core` (workspace dependency)

**Color palette (from tailwind.config.ts):**
- Primary: `brand-500` (#4f6ef7) / `brand-600` (#3d5be0)
- Text: `gray-900`, `gray-600`, `gray-400`
- Backgrounds: `white`, `gray-50`, `gray-100`

---

## File Structure

```
apps/web/src/
├── components/
│   ├── ui/
│   │   ├── button.tsx              # NEW — Task 1
│   │   ├── input.tsx               # NEW — Task 1
│   │   ├── select.tsx              # NEW — Task 1
│   │   ├── badge.tsx               # NEW — Task 1
│   │   ├── modal.tsx               # NEW — Task 1
│   │   ├── spinner.tsx             # NEW — Task 1
│   │   ├── avatar.tsx              # NEW — Task 1
│   │   └── empty-state.tsx         # NEW — Task 1
│   ├── sidebar.tsx                 # NEW — Task 2
│   ├── user-menu.tsx               # NEW — Task 2
│   ├── project-card.tsx            # NEW — Task 3
│   ├── new-project-modal.tsx       # NEW — Task 3
│   ├── project-filters.tsx         # NEW — Task 3
│   ├── page-preview.tsx            # NEW — Task 4
│   ├── workspace-tabs.tsx          # NEW — Task 4
│   ├── chat-panel.tsx              # NEW — Task 5
│   ├── css-diff-view.tsx           # NEW — Task 5
│   ├── export-panel.tsx            # NEW — Task 7
│   ├── preflight-results.tsx       # NEW — Task 7
│   ├── share-viewer.tsx            # NEW — Task 9
│   └── comment-pin.tsx             # NEW — Task 9
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx              # UPDATE — Task 2
│   │   ├── projects/
│   │   │   ├── page.tsx            # NEW — Task 3
│   │   │   └── [id]/
│   │   │       └── page.tsx        # NEW — Task 4
│   │   ├── templates/
│   │   │   └── page.tsx            # NEW — Task 10
│   │   └── team/
│   │       └── page.tsx            # NEW — Task 10
│   ├── share/
│   │   └── [token]/
│   │       └── page.tsx            # NEW — Task 9
│   └── api/v1/
│       └── projects/
│           └── [id]/
│               ├── chat/
│               │   └── route.ts    # NEW — Task 6
│               ├── export/
│               │   ├── pdf/
│               │   │   └── route.ts  # NEW — Task 8
│               │   ├── idml/
│               │   │   └── route.ts  # NEW — Task 8
│               │   └── svg/
│               │       └── route.ts  # NEW — Task 8
│               ├── preflight/
│               │   └── route.ts    # NEW — Task 8
│               └── share/
│                   └── route.ts    # NEW — Task 9
│       └── share/
│           └── [token]/
│               ├── comments/
│               │   └── route.ts    # NEW — Task 9
│               └── approve/
│                   └── route.ts    # NEW — Task 9
```

---

## Task 1: Shared UI Components

**Files to create:**
- `apps/web/src/components/ui/button.tsx`
- `apps/web/src/components/ui/input.tsx`
- `apps/web/src/components/ui/select.tsx`
- `apps/web/src/components/ui/badge.tsx`
- `apps/web/src/components/ui/modal.tsx`
- `apps/web/src/components/ui/spinner.tsx`
- `apps/web/src/components/ui/avatar.tsx`
- `apps/web/src/components/ui/empty-state.tsx`

- [ ] **Step 1: Create `apps/web/src/components/ui/button.tsx`**

```tsx
"use client";

import { forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-600 focus-visible:ring-brand-500 disabled:bg-brand-100 disabled:text-brand-300",
  secondary:
    "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:ring-brand-500 disabled:opacity-50",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 disabled:opacity-50",
  ghost:
    "bg-transparent text-gray-600 hover:bg-gray-100 focus-visible:ring-brand-500 disabled:opacity-50",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      className = "",
      children,
      ...rest
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-disabled={disabled || isLoading}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "cursor-pointer disabled:cursor-not-allowed",
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        ].join(" ")}
        {...rest}
      >
        {isLoading && (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
```

- [ ] **Step 2: Create `apps/web/src/components/ui/input.tsx`**

```tsx
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = "", ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? `${inputId}-error`
              : hint
                ? `${inputId}-hint`
                : undefined
          }
          className={[
            "rounded-md border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1",
            "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
            error
              ? "border-red-400 bg-red-50 focus:ring-red-500"
              : "border-gray-300 bg-white",
            className,
          ].join(" ")}
          {...rest}
        />
        {error && (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-gray-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
```

- [ ] **Step 3: Create `apps/web/src/components/ui/select.tsx`**

```tsx
import { forwardRef } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, id, className = "", ...rest }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : undefined}
          className={[
            "rounded-md border px-3 py-2 text-sm text-gray-900",
            "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1",
            "disabled:cursor-not-allowed disabled:bg-gray-50",
            "bg-white appearance-none cursor-pointer",
            error ? "border-red-400" : "border-gray-300",
            className,
          ].join(" ")}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={`${selectId}-error`} role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
```

- [ ] **Step 4: Create `apps/web/src/components/ui/badge.tsx`**

```tsx
import type { ProjectStatus } from "@/lib/supabase/types";

type BadgeVariant = "default" | ProjectStatus;

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<string, string> = {
  default: "bg-gray-100 text-gray-700",
  draft: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  review: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  archived: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  review: "In Review",
  completed: "Completed",
  archived: "Archived",
};

export function Badge({
  variant = "default",
  children,
  className = "",
}: BadgeProps) {
  const classes = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.default;
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        classes,
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge variant={status}>{STATUS_LABELS[status] ?? status}</Badge>
  );
}
```

- [ ] **Step 5: Create `apps/web/src/components/ui/modal.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      dialogRef.current?.focus();
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      {/* Dialog */}
      <dialog
        ref={dialogRef}
        open
        aria-labelledby="modal-title"
        aria-modal="true"
        tabIndex={-1}
        className={[
          "relative z-10 w-full rounded-xl bg-white p-6 shadow-xl",
          "focus:outline-none",
          SIZE_CLASSES[size],
        ].join(" ")}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2
            id="modal-title"
            className="text-lg font-semibold text-gray-900"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        {children}
      </dialog>
    </div>,
    document.body
  );
}
```

- [ ] **Step 6: Create `apps/web/src/components/ui/spinner.tsx`**

```tsx
interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

const SIZE_CLASSES = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-4",
};

export function Spinner({ size = "md", label = "Loading..." }: SpinnerProps) {
  return (
    <div role="status" aria-label={label} className="flex items-center justify-center">
      <div
        aria-hidden="true"
        className={[
          "animate-spin rounded-full border-gray-300 border-t-brand-500",
          SIZE_CLASSES[size],
        ].join(" ")}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
```

- [ ] **Step 7: Create `apps/web/src/components/ui/avatar.tsx`**

```tsx
interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({ src, name, size = "md", className = "" }: AvatarProps) {
  const initials = getInitials(name);

  return (
    <div
      aria-label={name ?? "User avatar"}
      role="img"
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium",
        SIZE_CLASSES[size],
        className,
      ].join(" ")}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name ?? "User avatar"}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-brand-100 text-brand-700">
          {initials}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Create `apps/web/src/components/ui/empty-state.tsx`**

```tsx
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      {icon && (
        <div aria-hidden="true" className="text-gray-300">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium text-gray-900">{title}</p>
        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
```

**Commit:** `feat(web): add shared UI component library (Button, Input, Select, Badge, Modal, Spinner, Avatar, EmptyState)`

---

## Task 2: Dashboard Sidebar & Navigation

**Files to update/create:**
- Update: `apps/web/src/app/(dashboard)/layout.tsx`
- Create: `apps/web/src/components/sidebar.tsx`
- Create: `apps/web/src/components/user-menu.tsx`

- [ ] **Step 1: Create `apps/web/src/components/user-menu.tsx`**

This is a Client Component because it handles the sign-out dropdown.

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { Avatar } from "@/components/ui/avatar";

interface UserMenuProps {
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

export function UserMenu({ name, email, avatarUrl }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="User menu"
        className="flex items-center gap-2 rounded-lg p-2 text-left hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <Avatar src={avatarUrl} name={name} size="sm" />
        <div className="hidden min-w-0 flex-1 md:block">
          <p className="truncate text-sm font-medium text-gray-900">
            {name ?? "User"}
          </p>
          <p className="truncate text-xs text-gray-500">{email}</p>
        </div>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="User options"
          className="absolute bottom-full left-0 mb-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          <div className="border-b border-gray-100 px-4 py-2">
            <p className="truncate text-sm font-medium text-gray-900">
              {name ?? "User"}
            </p>
            <p className="truncate text-xs text-gray-500">{email}</p>
          </div>
          <button
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/src/components/sidebar.tsx`**

The sidebar is a Server Component — it reads the session once and renders the nav links. `UserMenu` is the only client boundary inside it.

```tsx
import Link from "next/link";
import { auth } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { UserMenu } from "@/components/user-menu";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const FOLDER_ICON = (
  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </svg>
);

const TEMPLATE_ICON = (
  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
  </svg>
);

const TEAM_ICON = (
  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const SETTINGS_ICON = (
  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const BASE_NAV_ITEMS: NavItem[] = [
  { href: "/projects", label: "Projects", icon: FOLDER_ICON },
  { href: "/templates", label: "Templates", icon: TEMPLATE_ICON },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/team", label: "Team", icon: TEAM_ICON },
  { href: "/settings", label: "Settings", icon: SETTINGS_ICON },
];

function NavLink({ href, label, icon }: NavItem) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      {icon}
      {label}
    </Link>
  );
}

export async function Sidebar() {
  const session = await auth();
  const isAdmin = hasRole(session?.user?.role ?? "viewer", "admin");

  const navItems = [
    ...BASE_NAV_ITEMS,
    ...(isAdmin ? ADMIN_NAV_ITEMS : []),
  ];

  return (
    <nav
      aria-label="Main navigation"
      className="flex h-full w-64 shrink-0 flex-col border-r border-gray-200 bg-white"
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-200 px-5">
        <Link
          href="/projects"
          className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
        >
          <span className="text-lg font-bold text-brand-600">TypeSet</span>
          <span className="rounded bg-brand-500 px-1.5 py-0.5 text-xs font-semibold text-white">
            AI
          </span>
        </Link>
      </div>

      {/* Nav links */}
      <ul role="list" className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => (
          <li key={item.href}>
            <NavLink {...item} />
          </li>
        ))}
      </ul>

      {/* User section */}
      <div className="border-t border-gray-200 p-3">
        {session?.user && (
          <UserMenu
            name={session.user.name}
            email={session.user.email}
            avatarUrl={session.user.image}
          />
        )}
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Update `apps/web/src/app/(dashboard)/layout.tsx`**

```tsx
import { Sidebar } from "@/components/sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main
        id="main-content"
        className="flex-1 overflow-y-auto bg-gray-50"
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
```

**Commit:** `feat(web): add dashboard sidebar navigation with role-based links and user menu`

---

## Task 3: Projects List Page

**Files to create:**
- `apps/web/src/components/project-card.tsx`
- `apps/web/src/components/new-project-modal.tsx`
- `apps/web/src/components/project-filters.tsx`
- `apps/web/src/app/(dashboard)/projects/page.tsx`

- [ ] **Step 1: Create `apps/web/src/components/project-card.tsx`**

```tsx
import Link from "next/link";
import type { DbProject, DbUser } from "@/lib/supabase/types";
import { StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";

const BOOK_TYPE_LABELS: Record<string, string> = {
  novel: "Novel",
  non_fiction: "Non-fiction",
  children: "Children's",
  academic: "Academic",
  poetry: "Poetry",
  comic: "Comic",
  other: "Other",
};

interface ProjectCardProps {
  project: DbProject;
  assignee?: Pick<DbUser, "name" | "avatar_url"> | null;
}

function formatDueDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function ProjectCard({ project, assignee }: ProjectCardProps) {
  const dueDate = formatDueDate(project.due_date);
  const isOverdue =
    project.due_date &&
    project.status !== "completed" &&
    new Date(project.due_date) < new Date();

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      {/* Thumbnail placeholder */}
      <div
        aria-hidden="true"
        className="mb-4 h-32 w-full rounded-lg bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center"
      >
        <svg className="h-10 w-10 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      </div>

      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-brand-600">
          {project.name}
        </h3>
        <StatusBadge status={project.status} />
      </div>

      {/* Book type */}
      <p className="mb-4 text-xs text-gray-500">
        {BOOK_TYPE_LABELS[project.book_type] ?? project.book_type}
        {project.page_count ? ` · ${project.page_count} pages` : ""}
      </p>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between gap-2">
        {assignee ? (
          <div className="flex items-center gap-1.5">
            <Avatar src={assignee.avatar_url} name={assignee.name} size="sm" />
            <span className="text-xs text-gray-500 truncate max-w-[120px]">
              {assignee.name ?? "Assigned"}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">Unassigned</span>
        )}
        {dueDate && (
          <span
            className={[
              "text-xs",
              isOverdue ? "text-red-600 font-medium" : "text-gray-400",
            ].join(" ")}
          >
            {isOverdue ? "Overdue · " : "Due "}
            {dueDate}
          </span>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Create `apps/web/src/components/new-project-modal.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const BOOK_TYPE_OPTIONS = [
  { value: "novel", label: "Novel" },
  { value: "non_fiction", label: "Non-fiction" },
  { value: "children", label: "Children's Book" },
  { value: "academic", label: "Academic" },
  { value: "poetry", label: "Poetry" },
  { value: "comic", label: "Comic" },
  { value: "other", label: "Other" },
];

const PAGE_SIZE_OPTIONS = [
  { value: "A5", label: "A5 (148 × 210 mm)" },
  { value: "A4", label: "A4 (210 × 297 mm)" },
  { value: "US_Trade", label: "US Trade (6 × 9 in)" },
  { value: "US_Letter", label: "US Letter (8.5 × 11 in)" },
  { value: "Digest", label: "Digest (5.5 × 8.5 in)" },
  { value: "Custom", label: "Custom" },
];

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers?: { id: string; name: string | null }[];
}

interface FormState {
  name: string;
  description: string;
  book_type: string;
  page_size: string;
  assigned_to: string;
  due_date: string;
}

interface FormErrors {
  name?: string;
}

const INITIAL_FORM: FormState = {
  name: "",
  description: "",
  book_type: "novel",
  page_size: "A5",
  assigned_to: "",
  due_date: "",
};

export function NewProjectModal({
  isOpen,
  onClose,
  teamMembers = [],
}: NewProjectModalProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const memberOptions = teamMembers.map((m) => ({
    value: m.id,
    label: m.name ?? m.id,
  }));

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!form.name.trim()) {
      newErrors.name = "Project name is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      const payload: Record<string, string | undefined> = {
        name: form.name.trim(),
        description: form.description || undefined,
        book_type: form.book_type,
        page_size: form.page_size,
        assigned_to: form.assigned_to || undefined,
        due_date: form.due_date || undefined,
      };

      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(
          json.error?.message ?? "Failed to create project. Please try again."
        );
        return;
      }

      setForm(INITIAL_FORM);
      onClose();
      router.push(`/projects/${json.data.id}`);
      router.refresh();
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    if (!isSubmitting) {
      setForm(INITIAL_FORM);
      setErrors({});
      setServerError(null);
      onClose();
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Project" size="lg">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {serverError && (
          <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <Input
          label="Project Name"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="e.g. The Great Novel"
          error={errors.name}
          required
          autoFocus
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Brief description of the project (optional)"
            rows={2}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Book Type"
            name="book_type"
            value={form.book_type}
            onChange={handleChange}
            options={BOOK_TYPE_OPTIONS}
          />
          <Select
            label="Page Size"
            name="page_size"
            value={form.page_size}
            onChange={handleChange}
            options={PAGE_SIZE_OPTIONS}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {memberOptions.length > 0 && (
            <Select
              label="Assign To"
              name="assigned_to"
              value={form.assigned_to}
              onChange={handleChange}
              options={memberOptions}
              placeholder="Unassigned"
            />
          )}
          <Input
            label="Due Date"
            name="due_date"
            type="date"
            value={form.due_date}
            onChange={handleChange}
          />
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create Project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 3: Create `apps/web/src/components/project-filters.tsx`**

```tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Select } from "@/components/ui/select";
import type { ProjectStatus, BookType } from "@/lib/supabase/types";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "In Review" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

const BOOK_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "novel", label: "Novel" },
  { value: "non_fiction", label: "Non-fiction" },
  { value: "children", label: "Children's" },
  { value: "academic", label: "Academic" },
  { value: "poetry", label: "Poetry" },
  { value: "comic", label: "Comic" },
  { value: "other", label: "Other" },
];

interface TeamMember {
  id: string;
  name: string | null;
}

interface ProjectFiltersProps {
  teamMembers?: TeamMember[];
}

export function ProjectFilters({ teamMembers = [] }: ProjectFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const assigneeOptions = [
    { value: "", label: "All Assignees" },
    ...teamMembers.map((m) => ({ value: m.id, label: m.name ?? m.id })),
  ];

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("cursor"); // Reset pagination on filter change
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return (
    <div role="search" aria-label="Filter projects" className="flex flex-wrap items-center gap-3">
      <Select
        aria-label="Filter by status"
        options={STATUS_OPTIONS}
        value={(searchParams.get("status") as ProjectStatus) ?? ""}
        onChange={(e) => updateFilter("status", e.target.value)}
        className="w-40"
      />
      <Select
        aria-label="Filter by book type"
        options={BOOK_TYPE_OPTIONS}
        value={(searchParams.get("book_type") as BookType) ?? ""}
        onChange={(e) => updateFilter("book_type", e.target.value)}
        className="w-40"
      />
      {teamMembers.length > 0 && (
        <Select
          aria-label="Filter by assignee"
          options={assigneeOptions}
          value={searchParams.get("assigned_to") ?? ""}
          onChange={(e) => updateFilter("assigned_to", e.target.value)}
          className="w-44"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `apps/web/src/app/(dashboard)/projects/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ProjectCard } from "@/components/project-card";
import { ProjectFilters } from "@/components/project-filters";
import { NewProjectModal } from "@/components/new-project-modal";
import type { DbProject } from "@/lib/supabase/types";

const FOLDER_ICON = (
  <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </svg>
);

interface ProjectsResponse {
  data: DbProject[];
  meta: { cursor: string | null; hasMore: boolean; total: number };
}

async function fetchProjects(url: string): Promise<ProjectsResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load projects");
  return res.json();
}

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const apiUrl = buildApiUrl(searchParams);
  const { data, error, isLoading } = useSWR<ProjectsResponse>(apiUrl, fetchProjects);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          {data?.meta.total != null && (
            <p className="mt-1 text-sm text-gray-500">
              {data.meta.total} {data.meta.total === 1 ? "project" : "projects"}
            </p>
          )}
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Project
        </Button>
      </div>

      {/* Filters */}
      <ProjectFilters />

      {/* Content */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <Spinner size="lg" label="Loading projects..." />
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load projects. Please refresh the page.
        </div>
      )}

      {!isLoading && !error && data?.data.length === 0 && (
        <EmptyState
          icon={FOLDER_ICON}
          title="No projects yet"
          description="Create your first project to get started with AI-powered typesetting."
          action={
            <Button onClick={() => setIsModalOpen(true)}>Create a project</Button>
          }
        />
      )}

      {!isLoading && !error && (data?.data ?? []).length > 0 && (
        <ul
          role="list"
          aria-label="Projects"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {data!.data.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      )}

      <NewProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

function buildApiUrl(searchParams: ReturnType<typeof useSearchParams>): string {
  const params = new URLSearchParams();
  const status = searchParams.get("status");
  const bookType = searchParams.get("book_type");
  const assignedTo = searchParams.get("assigned_to");
  const cursor = searchParams.get("cursor");

  if (status) params.set("status", status);
  if (bookType) params.set("book_type", bookType);
  if (assignedTo) params.set("assigned_to", assignedTo);
  if (cursor) params.set("cursor", cursor);

  return `/api/v1/projects?${params.toString()}`;
}
```

> **Note:** This page uses `useSWR` for client-side data fetching. Add `"swr": "2.2.5"` to `apps/web/package.json` dependencies.

**Commit:** `feat(web): add projects list page with grid view, filters, and new project modal`

---

## Task 4: Project Workspace Page

**Files to create:**
- `apps/web/src/components/page-preview.tsx`
- `apps/web/src/components/workspace-tabs.tsx`
- `apps/web/src/app/(dashboard)/projects/[id]/page.tsx`

- [ ] **Step 1: Create `apps/web/src/components/workspace-tabs.tsx`**

```tsx
"use client";

import { useState } from "react";

type TabId = "content" | "layout" | "chat" | "export" | "activity";

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: "content", label: "Content" },
  { id: "layout", label: "Layout" },
  { id: "chat", label: "AI Chat" },
  { id: "export", label: "Export" },
  { id: "activity", label: "Activity" },
];

interface WorkspaceTabsProps {
  projectId: string;
  contentPanel: React.ReactNode;
  layoutPanel: React.ReactNode;
  chatPanel: React.ReactNode;
  exportPanel: React.ReactNode;
  activityPanel: React.ReactNode;
}

export function WorkspaceTabs({
  projectId: _projectId,
  contentPanel,
  layoutPanel,
  chatPanel,
  exportPanel,
  activityPanel,
}: WorkspaceTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("chat");

  const panels: Record<TabId, React.ReactNode> = {
    content: contentPanel,
    layout: layoutPanel,
    chat: chatPanel,
    export: exportPanel,
    activity: activityPanel,
  };

  return (
    <div className="flex h-full flex-col">
      {/* Tab list */}
      <div
        role="tablist"
        aria-label="Project panels"
        className="flex shrink-0 border-b border-gray-200 bg-white"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={[
              "px-4 py-3 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500",
              activeTab === tab.id
                ? "border-b-2 border-brand-500 text-brand-600"
                : "text-gray-500 hover:text-gray-700",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {TABS.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeTab !== tab.id}
          className="flex-1 overflow-y-auto"
        >
          {activeTab === tab.id && panels[tab.id]}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/src/components/page-preview.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface PagePreviewProps {
  projectId: string;
  pageCount: number;
  currentCss: string;
}

export function PagePreview({
  projectId: _projectId,
  pageCount,
  currentCss: _currentCss,
}: PagePreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading] = useState(false);

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < pageCount;

  function goToPrev() {
    if (canGoPrev) setCurrentPage((p) => p - 1);
  }

  function goToNext() {
    if (canGoNext) setCurrentPage((p) => p + 1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") goToPrev();
    if (e.key === "ArrowRight") goToNext();
  }

  return (
    <div
      className="flex h-full flex-col bg-gray-100"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="Page preview. Use arrow keys to navigate pages."
    >
      {/* Preview area */}
      <div className="flex flex-1 items-center justify-center p-6">
        {isLoading ? (
          <Spinner size="lg" label="Rendering page..." />
        ) : (
          <div
            role="img"
            aria-label={`Page ${currentPage} of ${pageCount}`}
            className="aspect-[3/4] w-full max-w-sm rounded-lg bg-white shadow-xl ring-1 ring-gray-200 flex items-center justify-center"
          >
            <div className="text-center text-gray-300">
              <p className="text-sm font-medium">Page {currentPage}</p>
              <p className="text-xs mt-1">Preview renders here</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation controls */}
      <div
        aria-label="Page navigation"
        className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-white px-4 py-3"
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={goToPrev}
          disabled={!canGoPrev}
          aria-label="Previous page"
        >
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Prev
        </Button>

        <div className="flex items-center gap-2">
          <label htmlFor="page-input" className="sr-only">
            Go to page
          </label>
          <input
            id="page-input"
            type="number"
            min={1}
            max={pageCount}
            value={currentPage}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (val >= 1 && val <= pageCount) setCurrentPage(val);
            }}
            className="w-14 rounded border border-gray-300 px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            aria-label={`Page ${currentPage} of ${pageCount}`}
          />
          <span className="text-sm text-gray-500">of {pageCount}</span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={goToNext}
          disabled={!canGoNext}
          aria-label="Next page"
        >
          Next
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `apps/web/src/app/(dashboard)/projects/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/rbac";
import { WorkspaceTabs } from "@/components/workspace-tabs";
import { PagePreview } from "@/components/page-preview";
import { ChatPanel } from "@/components/chat-panel";
import { ExportPanel } from "@/components/export-panel";
import { StatusBadge } from "@/components/ui/badge";
import type { Metadata } from "next";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const db = createServerClient();
  const { data: project } = await db
    .from("projects")
    .select("name")
    .eq("id", params.id)
    .single();

  return {
    title: project?.name ?? "Project",
  };
}

export default async function ProjectWorkspacePage({ params }: PageProps) {
  const session = await requireSession().catch(() => null);
  if (!session) notFound();

  const db = createServerClient();

  const [{ data: project }, { data: styles }, { data: content }] = await Promise.all([
    db.from("projects").select("*").eq("id", params.id).single(),
    db
      .from("project_styles")
      .select("css_content, version")
      .eq("project_id", params.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("project_content")
      .select("content_tree, version")
      .eq("project_id", params.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!project) notFound();

  // Viewers can only see their assigned projects
  if (
    session.user.role === "viewer" &&
    project.assigned_to !== session.user.id
  ) {
    notFound();
  }

  const currentCss = styles?.css_content ?? "";
  const pageCount = project.page_count ?? 1;

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col">
      {/* Workspace header */}
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="truncate text-lg font-semibold text-gray-900">
            {project.name}
          </h1>
          <StatusBadge status={project.status} />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 shrink-0">
          <span>{project.book_type}</span>
          <span aria-hidden="true">·</span>
          <span>{project.page_size}</span>
        </div>
      </header>

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Page preview */}
        <div className="hidden w-[55%] shrink-0 border-r border-gray-200 lg:flex lg:flex-col">
          <PagePreview
            projectId={project.id}
            pageCount={pageCount}
            currentCss={currentCss}
          />
        </div>

        {/* Right: Tabbed panel */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <WorkspaceTabs
            projectId={project.id}
            contentPanel={
              <div className="p-4">
                <ContentPanel content={content} />
              </div>
            }
            layoutPanel={
              <div className="p-4">
                <LayoutPanel css={currentCss} projectId={project.id} />
              </div>
            }
            chatPanel={
              <ChatPanel projectId={project.id} initialCss={currentCss} />
            }
            exportPanel={
              <ExportPanel projectId={project.id} />
            }
            activityPanel={
              <div className="p-4">
                <ActivityPanel projectId={project.id} />
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}

function ContentPanel({
  content,
}: {
  content: { content_tree: Record<string, unknown>; version: number } | null;
}) {
  if (!content) {
    return (
      <p className="text-sm text-gray-500">
        No content imported yet. Import a Markdown file or Google Doc to get started.
      </p>
    );
  }

  const tree = content.content_tree as { metadata?: { title?: string; author?: string }; chapters?: unknown[] };
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Content (v{content.version})</h2>
      {tree.metadata && (
        <dl className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
          <div className="flex gap-2">
            <dt className="font-medium text-gray-500 w-16 shrink-0">Title</dt>
            <dd className="text-gray-900">{tree.metadata.title ?? "Untitled"}</dd>
          </div>
          <div className="flex gap-2 mt-1">
            <dt className="font-medium text-gray-500 w-16 shrink-0">Author</dt>
            <dd className="text-gray-900">{tree.metadata.author ?? "—"}</dd>
          </div>
          <div className="flex gap-2 mt-1">
            <dt className="font-medium text-gray-500 w-16 shrink-0">Chapters</dt>
            <dd className="text-gray-900">{(tree.chapters ?? []).length}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

function LayoutPanel({ css, projectId: _projectId }: { css: string; projectId: string }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Current CSS Layout</h2>
      {css ? (
        <pre className="overflow-auto rounded-lg border border-gray-200 bg-gray-900 p-4 text-xs text-gray-100 font-mono max-h-96">
          <code>{css}</code>
        </pre>
      ) : (
        <p className="text-sm text-gray-500">
          No layout CSS yet. Use the AI Chat tab to generate a layout.
        </p>
      )}
    </div>
  );
}

async function ActivityPanel({ projectId }: { projectId: string }) {
  const { getProjectActivity } = await import("@/lib/activity");
  const { entries } = await getProjectActivity(projectId, { limit: 20 });

  const ACTION_LABELS: Record<string, string> = {
    project_created: "Project created",
    project_updated: "Project updated",
    style_applied: "Layout applied",
    style_updated: "Layout updated",
    content_imported: "Content imported",
    export_generated: "Export generated",
    share_link_created: "Share link created",
    comment_added: "Comment added",
    comment_resolved: "Comment resolved",
  };

  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500">No activity yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Recent Activity</h2>
      <ol aria-label="Project activity" className="relative space-y-4 border-l border-gray-200 pl-4">
        {entries.map((entry) => (
          <li key={entry.id} className="text-sm">
            <time
              dateTime={entry.created_at}
              className="block text-xs text-gray-400"
            >
              {new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(entry.created_at))}
            </time>
            <p className="text-gray-700">
              {ACTION_LABELS[entry.action] ?? entry.action}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
```

**Commit:** `feat(web): add project workspace page with split-pane layout and tabbed panel`

---

## Task 5: AI Chat Panel

**Files to create:**
- `apps/web/src/components/chat-panel.tsx`
- `apps/web/src/components/css-diff-view.tsx`

- [ ] **Step 1: Create `apps/web/src/components/css-diff-view.tsx`**

```tsx
interface CssDiffViewProps {
  patch: string;
}

interface DiffLine {
  type: "added" | "removed" | "context" | "header";
  content: string;
}

function parsePatch(patch: string): DiffLine[] {
  return patch.split("\n").map((line) => {
    if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) {
      return { type: "header", content: line };
    }
    if (line.startsWith("+")) return { type: "added", content: line.slice(1) };
    if (line.startsWith("-")) return { type: "removed", content: line.slice(1) };
    return { type: "context", content: line.startsWith(" ") ? line.slice(1) : line };
  });
}

export function CssDiffView({ patch }: CssDiffViewProps) {
  if (!patch) return null;

  const lines = parsePatch(patch);

  return (
    <div
      aria-label="CSS changes"
      className="overflow-auto rounded-lg border border-gray-200 font-mono text-xs"
    >
      {lines.map((line, idx) => {
        const lineClasses = {
          added: "bg-green-50 text-green-800",
          removed: "bg-red-50 text-red-800 line-through",
          header: "bg-gray-100 text-gray-500",
          context: "text-gray-700",
        }[line.type];

        return (
          <div
            key={idx}
            className={["px-3 py-0.5 leading-relaxed", lineClasses].join(" ")}
          >
            <span aria-hidden="true" className="mr-2 select-none opacity-50">
              {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
            </span>
            <span>{line.content}</span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/src/components/chat-panel.tsx`**

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CssDiffView } from "@/components/css-diff-view";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  diff?: { patch: string };
  isApplied?: boolean;
}

interface ChatPanelProps {
  projectId: string;
  initialCss: string;
}

export function ChatPanel({ projectId, initialCss: _initialCss }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load existing chat history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(`/api/v1/projects/${projectId}/chat`);
        if (!res.ok) return;
        const { data } = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setMessages(
            data.map((m: { id: string; role: "user" | "assistant"; content: string }) => ({
              id: m.id,
              role: m.role,
              content: m.content,
            }))
          );
        }
      } catch {
        // Silently fail — chat history is non-critical
      }
    }
    loadHistory();
  }, [projectId]);

  async function handleSend() {
    const message = input.trim();
    if (!message || isSending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      const formData = new FormData();
      formData.append("message", message);
      if (referenceFile) {
        formData.append("reference_image", referenceFile);
        setReferenceFile(null);
      }

      const res = await fetch(`/api/v1/projects/${projectId}/chat`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: json.error?.message ?? "Sorry, something went wrong. Please try again.",
          },
        ]);
        return;
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: json.data.message,
        diff: json.data.diff,
        isApplied: json.data.isApplied,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setCanUndo(json.data.canUndo ?? false);
      setCanRedo(false);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Network error. Please check your connection and try again.",
        },
      ]);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  }

  async function handleUndo() {
    const res = await fetch(`/api/v1/projects/${projectId}/chat/undo`, {
      method: "POST",
    });
    const json = await res.json();
    if (res.ok) {
      setCanUndo(json.data.canUndo ?? false);
      setCanRedo(true);
    }
  }

  async function handleRedo() {
    const res = await fetch(`/api/v1/projects/${projectId}/chat/redo`, {
      method: "POST",
    });
    const json = await res.json();
    if (res.ok) {
      setCanUndo(true);
      setCanRedo(json.data.canRedo ?? false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 bg-white px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleUndo}
          disabled={!canUndo}
          aria-label="Undo last CSS change"
          title="Undo"
        >
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
          Undo
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRedo}
          disabled={!canRedo}
          aria-label="Redo last CSS change"
          title="Redo"
        >
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
          </svg>
          Redo
        </Button>
      </div>

      {/* Message list */}
      <div
        aria-live="polite"
        aria-label="Chat messages"
        className="flex-1 overflow-y-auto space-y-4 p-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">
                Describe the layout changes you want
              </p>
              <p className="mt-1 text-xs text-gray-400">
                e.g. "Increase the body font size to 12pt" or "Add a decorative drop cap to chapter openings"
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={[
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start",
            ].join(" ")}
          >
            <div
              className={[
                "max-w-[85%] rounded-xl px-4 py-3 text-sm",
                msg.role === "user"
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-900",
              ].join(" ")}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              {msg.diff?.patch && msg.isApplied && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-medium text-gray-500">
                    CSS changes applied:
                  </p>
                  <CssDiffView patch={msg.diff.patch} />
                </div>
              )}
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex justify-start">
            <div className="rounded-xl bg-gray-100 px-4 py-3">
              <Spinner size="sm" label="AI is thinking..." />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* Reference image preview */}
      {referenceFile && (
        <div className="flex shrink-0 items-center gap-2 border-t border-gray-100 bg-gray-50 px-4 py-2">
          <svg aria-hidden="true" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <span className="text-xs text-gray-600 flex-1 truncate">{referenceFile.name}</span>
          <button
            onClick={() => setReferenceFile(null)}
            aria-label={`Remove reference image ${referenceFile.name}`}
            className="text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 border-t border-gray-200 bg-white p-3">
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach reference image"
            title="Attach reference image"
            className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-hidden="true"
            onChange={(e) => setReferenceFile(e.target.files?.[0] ?? null)}
          />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the layout change you want... (Enter to send)"
            rows={2}
            aria-label="Chat message"
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
          />
          <Button
            onClick={handleSend}
            isLoading={isSending}
            disabled={!input.trim()}
            size="sm"
            aria-label="Send message"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Commit:** `feat(web): add AI chat panel with CSS diff view, undo/redo, and image upload`

---

## Task 6: Chat API Route

**Files to create:**
- `apps/web/src/app/api/v1/projects/[id]/chat/route.ts`

- [ ] **Step 1: Create `apps/web/src/app/api/v1/projects/[id]/chat/route.ts`**

```ts
import { NextResponse } from "next/server";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createServerClient } from "@/lib/supabase/server";
import { requireSession, handleAuthError } from "@/lib/rbac";
import {
  createChatSession,
  sendChatMessage,
  undoLastChange,
  redoLastChange,
  getChatHistory,
} from "@typeset-ai/core";
import type { ContentTree } from "@typeset-ai/core";

interface RouteParams {
  params: { id: string };
}

// In-memory session store — replace with Redis in production
const SESSION_STORE = new Map<string, ReturnType<typeof createChatSession>>();

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

async function getOrCreateSession(
  projectId: string,
  db: ReturnType<typeof createServerClient>
): Promise<ReturnType<typeof createChatSession>> {
  const existing = SESSION_STORE.get(projectId);
  if (existing) return existing;

  const [{ data: styles }, { data: content }] = await Promise.all([
    db
      .from("project_styles")
      .select("css_content")
      .eq("project_id", projectId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("project_content")
      .select("content_tree")
      .eq("project_id", projectId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const currentCss = styles?.css_content ?? "";
  const contentTree = (content?.content_tree ?? {
    metadata: { title: "Untitled", author: "", source: "manual", pageCount: 0 },
    frontMatter: [],
    chapters: [],
    backMatter: [],
    assets: [],
  }) as ContentTree;

  const session = createChatSession(contentTree, currentCss);
  SESSION_STORE.set(projectId, session);
  return session;
}

export async function GET(_request: Request, { params }: RouteParams) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const db = createServerClient();

  const { data: messages, error } = await db
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", params.id) // conversation_id scoped by project via join
    .order("created_at", { ascending: true })
    .limit(100);

  // Graceful fallback: return empty array if no conversation exists yet
  if (error && error.code !== "PGRST116") {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch chat history" } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: messages ?? [],
    requestId: crypto.randomUUID(),
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  let authSession;
  try {
    authSession = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const db = createServerClient();

  // Verify project exists and user has access
  const { data: project } = await db
    .from("projects")
    .select("id, assigned_to")
    .eq("id", params.id)
    .single();

  if (!project) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Project not found" } },
      { status: 404 }
    );
  }

  const formData = await request.formData();
  const message = formData.get("message");

  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: "Message is required",
          details: [{ field: "message", issue: "Must be a non-empty string" }],
        },
      },
      { status: 422 }
    );
  }

  // Handle optional reference image
  let imageTmpPath: string | undefined;
  const imageFile = formData.get("reference_image");

  if (imageFile instanceof File && imageFile.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.has(imageFile.type)) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Invalid image type",
            details: [{ field: "reference_image", issue: "Must be PNG, JPEG, or WebP" }],
          },
        },
        { status: 422 }
      );
    }

    if (imageFile.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Image too large",
            details: [{ field: "reference_image", issue: "Maximum size is 10 MB" }],
          },
        },
        { status: 422 }
      );
    }

    const tmpDir = join(tmpdir(), "typeset-uploads");
    await mkdir(tmpDir, { recursive: true });
    const ext = imageFile.type.split("/")[1];
    imageTmpPath = join(tmpDir, `${crypto.randomUUID()}.${ext}`);
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    await writeFile(imageTmpPath, buffer);
  }

  try {
    const chatSession = await getOrCreateSession(params.id, db);
    const response = await sendChatMessage(chatSession, message.trim(), imageTmpPath);

    // Persist updated CSS to project_styles
    if (response.isApplied) {
      const { data: latestStyles } = await db
        .from("project_styles")
        .select("version")
        .eq("project_id", params.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersion = (latestStyles?.version ?? 0) + 1;

      await db.from("project_styles").insert({
        project_id: params.id,
        css_content: response.css,
        version: nextVersion,
        created_by: authSession!.user.id,
      });
    }

    return NextResponse.json({
      data: {
        message: response.message,
        css: response.css,
        diff: response.diff,
        isApplied: response.isApplied,
        canUndo: chatSession.undoStack.length > 0,
        canRedo: chatSession.redoStack.length > 0,
      },
      requestId: crypto.randomUUID(),
    });
  } finally {
    // Always clean up the temp image file
    if (imageTmpPath) {
      await unlink(imageTmpPath).catch(() => undefined);
    }
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  const session = SESSION_STORE.get(params.id);
  if (!session) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "No active chat session for this project" } },
      { status: 404 }
    );
  }

  if (action === "undo") {
    const success = undoLastChange(session);
    return NextResponse.json({
      data: {
        success,
        canUndo: session.undoStack.length > 0,
        canRedo: session.redoStack.length > 0,
        currentCss: session.currentCss,
      },
      requestId: crypto.randomUUID(),
    });
  }

  if (action === "redo") {
    const success = redoLastChange(session);
    return NextResponse.json({
      data: {
        success,
        canUndo: session.undoStack.length > 0,
        canRedo: session.redoStack.length > 0,
        currentCss: session.currentCss,
      },
      requestId: crypto.randomUUID(),
    });
  }

  return NextResponse.json(
    { error: { code: "BAD_REQUEST", message: "Unknown action. Use ?action=undo or ?action=redo" } },
    { status: 400 }
  );
}
```

> **Note:** The in-memory `SESSION_STORE` works for single-instance deployments. For multi-instance production, replace with a Redis store keyed by `projectId`. The chat history persistence relies on the `chat_conversations` and `chat_messages` tables — a follow-up task should wire up full DB persistence of each message.

> **Undo/Redo endpoints:** The `ChatPanel` calls `POST /api/v1/projects/:id/chat/undo` and `POST /api/v1/projects/:id/chat/redo`. Create these as thin route files that delegate to `DELETE` with `?action=undo/redo`, or duplicate the route logic. The cleanest approach is separate route files:

- `apps/web/src/app/api/v1/projects/[id]/chat/undo/route.ts`
- `apps/web/src/app/api/v1/projects/[id]/chat/redo/route.ts`

```ts
// undo/route.ts
import { NextResponse } from "next/server";
import { requireSession, handleAuthError } from "@/lib/rbac";
import { undoLastChange } from "@typeset-ai/core";

const SESSION_STORE = (globalThis as Record<string, unknown>)["CHAT_SESSIONS"] as Map<string, ReturnType<typeof import("@typeset-ai/core").createChatSession>>;

interface RouteParams {
  params: { id: string };
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  if (!SESSION_STORE?.has(params.id)) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "No active session" } },
      { status: 404 }
    );
  }

  const session = SESSION_STORE.get(params.id)!;
  const success = undoLastChange(session);

  return NextResponse.json({
    data: {
      success,
      canUndo: session.undoStack.length > 0,
      canRedo: session.redoStack.length > 0,
    },
    requestId: crypto.randomUUID(),
  });
}
```

> The redo route is identical but calls `redoLastChange`. For the session store to be shared between the chat route and these sub-routes, refactor the store into a shared singleton module at `src/lib/chat-session-store.ts`:

```ts
// src/lib/chat-session-store.ts
import type { ChatSession } from "@typeset-ai/core";

// Module-level singleton — shared within a Node.js process
const store = new Map<string, ChatSession>();

export const chatSessionStore = {
  get: (projectId: string) => store.get(projectId),
  set: (projectId: string, session: ChatSession) => store.set(projectId, session),
  has: (projectId: string) => store.has(projectId),
};
```

**Commit:** `feat(web): add chat API route with session management, undo/redo, and CSS persistence`

---

## Task 7: Export Panel

**Files to create:**
- `apps/web/src/components/preflight-results.tsx`
- `apps/web/src/components/export-panel.tsx`

- [ ] **Step 1: Create `apps/web/src/components/preflight-results.tsx`**

```tsx
import type { PreflightResult } from "@typeset-ai/core";

interface PreflightResultsProps {
  result: PreflightResult;
}

export function PreflightResults({ result }: PreflightResultsProps) {
  const { errors, warnings } = result;

  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
        <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        All preflight checks passed — ready to export.
      </div>
    );
  }

  return (
    <div className="space-y-2" aria-label="Preflight results">
      {errors.map((issue) => (
        <div
          key={`error-${issue.code}`}
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <span className="font-medium">Error [{issue.code}]</span>
            {issue.page != null && <span> · Page {issue.page}</span>}
            <p>{issue.message}</p>
          </div>
        </div>
      ))}
      {warnings.map((issue) => (
        <div
          key={`warning-${issue.code}`}
          className="flex items-start gap-2 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-700"
        >
          <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div>
            <span className="font-medium">Warning [{issue.code}]</span>
            {issue.page != null && <span> · Page {issue.page}</span>}
            <p>{issue.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/src/components/export-panel.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PreflightResults } from "@/components/preflight-results";
import type { PreflightResult } from "@typeset-ai/core";

type ExportFormat = "pdf" | "proof" | "idml" | "svg";

interface ExportPanelProps {
  projectId: string;
}

interface ExportState {
  isRunning: boolean;
  format: ExportFormat | null;
  error: string | null;
}

const INITIAL_EXPORT_STATE: ExportState = {
  isRunning: false,
  format: null,
  error: null,
};

export function ExportPanel({ projectId }: ExportPanelProps) {
  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [isCheckingPreflight, setIsCheckingPreflight] = useState(false);
  const [exportState, setExportState] = useState<ExportState>(INITIAL_EXPORT_STATE);

  async function runPreflight() {
    setIsCheckingPreflight(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/preflight`);
      const json = await res.json();
      if (res.ok) {
        setPreflight(json.data);
      }
    } catch {
      // Non-critical — user can still attempt export
    } finally {
      setIsCheckingPreflight(false);
    }
  }

  async function downloadExport(format: ExportFormat) {
    setExportState({ isRunning: true, format, error: null });

    try {
      const url = format === "proof"
        ? `/api/v1/projects/${projectId}/export/pdf?proof=true`
        : `/api/v1/projects/${projectId}/export/${format}`;

      const res = await fetch(url, { method: "POST" });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setExportState({
          isRunning: false,
          format: null,
          error: json.error?.message ?? "Export failed. Please try again.",
        });
        return;
      }

      // Trigger download from the binary response
      const blob = await res.blob();
      const extension = { pdf: "pdf", proof: "pdf", idml: "idml", svg: "zip" }[format];
      const filename = `export.${extension}`;
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(objectUrl);

      setExportState(INITIAL_EXPORT_STATE);
    } catch {
      setExportState({
        isRunning: false,
        format: null,
        error: "Network error during export. Please check your connection.",
      });
    }
  }

  const hasErrors = (preflight?.errors ?? []).length > 0;

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Preflight */}
      <section aria-labelledby="preflight-heading">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="preflight-heading" className="text-sm font-semibold text-gray-700">
            Preflight Check
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={runPreflight}
            isLoading={isCheckingPreflight}
          >
            Run Check
          </Button>
        </div>

        {!preflight && !isCheckingPreflight && (
          <p className="text-sm text-gray-500">
            Run a preflight check to verify your document is ready for export.
          </p>
        )}

        {isCheckingPreflight && (
          <div className="flex justify-center py-4">
            <Spinner size="sm" label="Running preflight checks..." />
          </div>
        )}

        {preflight && !isCheckingPreflight && (
          <PreflightResults result={preflight} />
        )}
      </section>

      {/* Export error */}
      {exportState.error && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {exportState.error}
        </div>
      )}

      {/* Export buttons */}
      <section aria-labelledby="export-heading">
        <h2 id="export-heading" className="mb-3 text-sm font-semibold text-gray-700">
          Download
        </h2>

        {hasErrors && (
          <div role="status" className="mb-3 rounded-md bg-yellow-50 px-4 py-3 text-xs text-yellow-700">
            Preflight errors found. You can still export, but the output may have issues.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <ExportButton
            label="Print PDF"
            description="Press-ready PDF with crop marks"
            format="pdf"
            exportState={exportState}
            onExport={downloadExport}
          />
          <ExportButton
            label="Proof PDF"
            description="RGB PDF for screen review"
            format="proof"
            exportState={exportState}
            onExport={downloadExport}
          />
          <ExportButton
            label="IDML"
            description="InDesign compatible file"
            format="idml"
            exportState={exportState}
            onExport={downloadExport}
          />
          <ExportButton
            label="SVG Pages"
            description="Vector pages as ZIP"
            format="svg"
            exportState={exportState}
            onExport={downloadExport}
          />
        </div>
      </section>
    </div>
  );
}

interface ExportButtonProps {
  label: string;
  description: string;
  format: ExportFormat;
  exportState: ExportState;
  onExport: (format: ExportFormat) => void;
}

function ExportButton({
  label,
  description,
  format,
  exportState,
  onExport,
}: ExportButtonProps) {
  const isThisFormat = exportState.format === format;
  const isAnyRunning = exportState.isRunning;

  return (
    <button
      onClick={() => !isAnyRunning && onExport(format)}
      disabled={isAnyRunning}
      aria-label={`${label}: ${description}`}
      aria-busy={isThisFormat}
      className={[
        "flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        "disabled:cursor-not-allowed",
        isThisFormat
          ? "border-brand-300 bg-brand-50"
          : "border-gray-200 bg-white hover:border-brand-200 hover:bg-brand-50",
      ].join(" ")}
    >
      {isThisFormat && exportState.isRunning ? (
        <Spinner size="sm" label={`Generating ${label}...`} />
      ) : (
        <span className="text-sm font-medium text-gray-900">{label}</span>
      )}
      <span className="text-xs text-gray-500">{description}</span>
    </button>
  );
}
```

**Commit:** `feat(web): add export panel with preflight check display and download buttons`

---

## Task 8: Export API Routes

**Files to create:**
- `apps/web/src/app/api/v1/projects/[id]/export/pdf/route.ts`
- `apps/web/src/app/api/v1/projects/[id]/export/idml/route.ts`
- `apps/web/src/app/api/v1/projects/[id]/export/svg/route.ts`
- `apps/web/src/app/api/v1/projects/[id]/preflight/route.ts`

- [ ] **Step 1: Create `apps/web/src/app/api/v1/projects/[id]/preflight/route.ts`**

```ts
import { NextResponse } from "next/server";
import { requireSession, handleAuthError } from "@/lib/rbac";
import { createServerClient } from "@/lib/supabase/server";
import { buildHtml, runPreflight } from "@typeset-ai/core";
import type { ContentTree } from "@typeset-ai/core";

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const db = createServerClient();

  const [{ data: styles }, { data: content }] = await Promise.all([
    db
      .from("project_styles")
      .select("css_content")
      .eq("project_id", params.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("project_content")
      .select("content_tree")
      .eq("project_id", params.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!content) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "No content found for this project" } },
      { status: 404 }
    );
  }

  const contentTree = content.content_tree as ContentTree;
  const css = styles?.css_content ?? "";
  const html = buildHtml(contentTree, css);
  const result = await runPreflight(html);

  return NextResponse.json({ data: result, requestId: crypto.randomUUID() });
}
```

- [ ] **Step 2: Create `apps/web/src/app/api/v1/projects/[id]/export/pdf/route.ts`**

```ts
import { NextResponse } from "next/server";
import { requireSession, handleAuthError } from "@/lib/rbac";
import { createServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { buildHtml, renderPdf } from "@typeset-ai/core";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ContentTree } from "@typeset-ai/core";

interface RouteParams {
  params: { id: string };
}

export async function POST(request: Request, { params }: RouteParams) {
  let authSession;
  try {
    authSession = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const { searchParams } = new URL(request.url);
  const isProof = searchParams.get("proof") === "true";

  const db = createServerClient();

  const [{ data: styles }, { data: content }] = await Promise.all([
    db
      .from("project_styles")
      .select("css_content")
      .eq("project_id", params.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("project_content")
      .select("content_tree")
      .eq("project_id", params.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!content) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "No content found for this project" } },
      { status: 404 }
    );
  }

  const contentTree = content.content_tree as ContentTree;
  const css = styles?.css_content ?? "";
  const html = buildHtml(contentTree, css);

  const outputDir = join(tmpdir(), "typeset-exports");
  await mkdir(outputDir, { recursive: true });
  const outputPath = join(outputDir, `${params.id}-${Date.now()}.pdf`);

  try {
    await renderPdf(html, {
      format: isProof ? "pdf-proof" : "pdf",
      outputPath,
      colorProfile: isProof ? "rgb" : "cmyk",
      includeBleed: !isProof,
      includeCropMarks: !isProof,
    });

    const { readFile } = await import("node:fs/promises");
    const pdfBuffer = await readFile(outputPath);

    await logActivity(params.id, authSession!.user.id, "export_generated", {
      format: isProof ? "pdf-proof" : "pdf",
    });

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${params.id}-${isProof ? "proof" : "print"}.pdf"`,
        "Content-Length": String(pdfBuffer.byteLength),
      },
    });
  } finally {
    await unlink(outputPath).catch(() => undefined);
  }
}
```

- [ ] **Step 3: Create `apps/web/src/app/api/v1/projects/[id]/export/idml/route.ts`**

```ts
import { NextResponse } from "next/server";
import { requireSession, handleAuthError } from "@/lib/rbac";
import { createServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { buildHtml, exportIdml } from "@typeset-ai/core";
import { writeFile, readFile, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ContentTree } from "@typeset-ai/core";

interface RouteParams {
  params: { id: string };
}

export async function POST(_request: Request, { params }: RouteParams) {
  let authSession;
  try {
    authSession = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const db = createServerClient();

  const [{ data: styles }, { data: content }] = await Promise.all([
    db
      .from("project_styles")
      .select("css_content")
      .eq("project_id", params.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("project_content")
      .select("content_tree")
      .eq("project_id", params.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!content) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "No content found for this project" } },
      { status: 404 }
    );
  }

  const contentTree = content.content_tree as ContentTree;
  const css = styles?.css_content ?? "";
  const html = buildHtml(contentTree, css);

  const outputDir = join(tmpdir(), "typeset-exports");
  await mkdir(outputDir, { recursive: true });
  const outputPath = join(outputDir, `${params.id}-${Date.now()}.idml`);

  try {
    await exportIdml(html, {
      outputPath,
      preserveStyles: true,
      embedImages: true,
    });

    const idmlBuffer = await readFile(outputPath);

    await logActivity(params.id, authSession!.user.id, "export_generated", {
      format: "idml",
    });

    return new Response(idmlBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.adobe.indesign-idml-package",
        "Content-Disposition": `attachment; filename="${params.id}.idml"`,
        "Content-Length": String(idmlBuffer.byteLength),
      },
    });
  } finally {
    await unlink(outputPath).catch(() => undefined);
  }
}
```

- [ ] **Step 4: Create `apps/web/src/app/api/v1/projects/[id]/export/svg/route.ts`**

```ts
import { NextResponse } from "next/server";
import { requireSession, handleAuthError } from "@/lib/rbac";
import { createServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { buildHtml, exportSvg } from "@typeset-ai/core";
import { readdir, readFile, unlink, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import JSZip from "jszip";
import type { ContentTree } from "@typeset-ai/core";

interface RouteParams {
  params: { id: string };
}

export async function POST(_request: Request, { params }: RouteParams) {
  let authSession;
  try {
    authSession = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const db = createServerClient();

  const [{ data: styles }, { data: content }] = await Promise.all([
    db
      .from("project_styles")
      .select("css_content")
      .eq("project_id", params.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("project_content")
      .select("content_tree")
      .eq("project_id", params.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!content) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "No content found for this project" } },
      { status: 404 }
    );
  }

  const contentTree = content.content_tree as ContentTree;
  const css = styles?.css_content ?? "";
  const html = buildHtml(contentTree, css);

  const outputDir = join(tmpdir(), `typeset-svg-${params.id}-${Date.now()}`);
  await mkdir(outputDir, { recursive: true });

  try {
    await exportSvg(html, {
      outputDir,
      embedImages: true,
      preserveText: true,
    });

    // Zip all SVG files
    const files = (await readdir(outputDir)).filter((f) => f.endsWith(".svg"));
    const zip = new JSZip();
    await Promise.all(
      files.map(async (filename) => {
        const data = await readFile(join(outputDir, filename));
        zip.file(filename, data);
      })
    );

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    await logActivity(params.id, authSession!.user.id, "export_generated", {
      format: "svg",
      pageCount: files.length,
    });

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${params.id}-pages.zip"`,
        "Content-Length": String(zipBuffer.byteLength),
      },
    });
  } finally {
    await rm(outputDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
```

**Commit:** `feat(web): add export API routes for PDF, IDML, and SVG with preflight check endpoint`

---

## Task 9: Share Links & Client Review

**Files to create:**
- `apps/web/src/app/api/v1/projects/[id]/share/route.ts`
- `apps/web/src/app/api/v1/share/[token]/comments/route.ts`
- `apps/web/src/app/api/v1/share/[token]/approve/route.ts`
- `apps/web/src/components/share-viewer.tsx`
- `apps/web/src/components/comment-pin.tsx`
- `apps/web/src/app/share/[token]/page.tsx`

Also update the middleware to whitelist `/share/` paths (no auth required for public share pages).

- [ ] **Step 1: Update `apps/web/src/middleware.ts` to allow share routes**

```ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/login", "/api/auth", "/share", "/api/v1/share"]);

function isPublicPath(pathname: string): boolean {
  for (const path of PUBLIC_PATHS) {
    if (pathname === path || pathname.startsWith(`${path}/`)) return true;
  }
  return false;
}

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  const session = (req as NextRequest & { auth: { user?: { id: string } } | null }).auth;
  if (!session?.user?.id) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
```

- [ ] **Step 2: Create `apps/web/src/app/api/v1/projects/[id]/share/route.ts`**

```ts
import { NextResponse } from "next/server";
import { requireSession, handleAuthError } from "@/lib/rbac";
import { createServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import type { SharePermission } from "@/lib/supabase/types";

const ALLOWED_PERMISSIONS: SharePermission[] = ["view", "comment"];
const DEFAULT_EXPIRY_DAYS = 7;

interface RouteParams {
  params: { id: string };
}

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

export async function POST(request: Request, { params }: RouteParams) {
  let authSession;
  try {
    authSession = await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  let body: {
    permissions?: SharePermission;
    expires_in_days?: number;
  };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const permissions = body.permissions ?? "view";
  const expiresInDays = body.expires_in_days ?? DEFAULT_EXPIRY_DAYS;

  if (!ALLOWED_PERMISSIONS.includes(permissions)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: "Invalid permissions value",
          details: [{ field: "permissions", issue: "Must be 'view' or 'comment'" }],
        },
      },
      { status: 422 }
    );
  }

  const db = createServerClient();

  // Verify project exists
  const { data: project } = await db
    .from("projects")
    .select("id, name")
    .eq("id", params.id)
    .single();

  if (!project) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Project not found" } },
      { status: 404 }
    );
  }

  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const { data: shareLink, error } = await db
    .from("share_links")
    .insert({
      project_id: params.id,
      token,
      permissions,
      expires_at: expiresAt.toISOString(),
      created_by: authSession!.user.id,
      password_hash: null,
    })
    .select()
    .single();

  if (error || !shareLink) {
    console.error("Failed to create share link", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create share link" } },
      { status: 500 }
    );
  }

  await logActivity(params.id, authSession!.user.id, "share_link_created", {
    token,
    permissions,
    expires_at: expiresAt.toISOString(),
  });

  return NextResponse.json(
    {
      data: {
        ...shareLink,
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/share/${token}`,
      },
      requestId: crypto.randomUUID(),
    },
    { status: 201 }
  );
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    await requireSession();
  } catch (err) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
  }

  const db = createServerClient();

  const { data: links, error } = await db
    .from("share_links")
    .select("id, token, permissions, expires_at, created_at, created_by")
    .eq("project_id", params.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch share links" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: links ?? [], requestId: crypto.randomUUID() });
}
```

- [ ] **Step 3: Create `apps/web/src/app/api/v1/share/[token]/comments/route.ts`**

```ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";

interface RouteParams {
  params: { token: string };
}

const MAX_COMMENT_LENGTH = 2000;
const MAX_AUTHOR_LENGTH = 100;

export async function GET(_request: Request, { params }: RouteParams) {
  const db = createServerClient();

  const { data: shareLink } = await db
    .from("share_links")
    .select("id, project_id, permissions, expires_at")
    .eq("token", params.token)
    .single();

  if (!shareLink) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Share link not found or expired" } },
      { status: 404 }
    );
  }

  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    return NextResponse.json(
      { error: { code: "GONE", message: "This share link has expired" } },
      { status: 410 }
    );
  }

  const { data: comments, error } = await db
    .from("comments")
    .select("id, page_number, x_position, y_position, content, author_name, resolved, created_at")
    .eq("project_id", shareLink.project_id)
    .eq("resolved", false)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch comments" } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: comments ?? [], requestId: crypto.randomUUID() });
}

export async function POST(request: Request, { params }: RouteParams) {
  const db = createServerClient();

  const { data: shareLink } = await db
    .from("share_links")
    .select("id, project_id, permissions, expires_at")
    .eq("token", params.token)
    .single();

  if (!shareLink) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Share link not found" } },
      { status: 404 }
    );
  }

  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    return NextResponse.json(
      { error: { code: "GONE", message: "This share link has expired" } },
      { status: 410 }
    );
  }

  if (shareLink.permissions !== "comment") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "This share link does not allow comments" } },
      { status: 403 }
    );
  }

  let body: {
    content: string;
    author_name: string;
    page_number: number;
    x_position: number;
    y_position: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const { content, author_name, page_number, x_position, y_position } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Comment content is required" } },
      { status: 422 }
    );
  }

  if (content.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: `Comment must be under ${MAX_COMMENT_LENGTH} characters` } },
      { status: 422 }
    );
  }

  if (!author_name || typeof author_name !== "string") {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "Author name is required" } },
      { status: 422 }
    );
  }

  if (author_name.length > MAX_AUTHOR_LENGTH) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: `Author name must be under ${MAX_AUTHOR_LENGTH} characters` } },
      { status: 422 }
    );
  }

  const { data: comment, error } = await db
    .from("comments")
    .insert({
      project_id: shareLink.project_id,
      page_number: page_number ?? 1,
      x_position: x_position ?? 0,
      y_position: y_position ?? 0,
      content: content.trim(),
      author_name: author_name.trim(),
      author_id: null,
      share_link_id: shareLink.id,
      resolved: false,
    })
    .select()
    .single();

  if (error || !comment) {
    console.error("Failed to insert comment", { cause: error });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to save comment" } },
      { status: 500 }
    );
  }

  await logActivity(shareLink.project_id, "anonymous", "comment_added", {
    share_token: params.token,
    page_number,
  });

  return NextResponse.json({ data: comment, requestId: crypto.randomUUID() }, { status: 201 });
}
```

- [ ] **Step 4: Create `apps/web/src/app/api/v1/share/[token]/approve/route.ts`**

```ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";

interface RouteParams {
  params: { token: string };
}

export async function POST(request: Request, { params }: RouteParams) {
  const db = createServerClient();

  const { data: shareLink } = await db
    .from("share_links")
    .select("id, project_id, permissions, expires_at")
    .eq("token", params.token)
    .single();

  if (!shareLink) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Share link not found" } },
      { status: 404 }
    );
  }

  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    return NextResponse.json(
      { error: { code: "GONE", message: "This share link has expired" } },
      { status: 410 }
    );
  }

  let body: { approved_by: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  if (!body.approved_by || typeof body.approved_by !== "string") {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "approved_by name is required" } },
      { status: 422 }
    );
  }

  // Update the project status to 'completed'
  await db
    .from("projects")
    .update({ status: "completed" })
    .eq("id", shareLink.project_id);

  await logActivity(shareLink.project_id, "anonymous", "project_updated", {
    approved_by: body.approved_by.trim(),
    via_share_token: params.token,
    action: "client_approval",
  });

  return NextResponse.json({
    data: { approved: true, project_id: shareLink.project_id },
    requestId: crypto.randomUUID(),
  });
}
```

- [ ] **Step 5: Create `apps/web/src/components/comment-pin.tsx`**

```tsx
"use client";

interface CommentPinProps {
  id: string;
  x: number;
  y: number;
  authorName: string;
  content: string;
  isSelected: boolean;
  onClick: (id: string) => void;
}

export function CommentPin({
  id,
  x,
  y,
  authorName,
  content,
  isSelected,
  onClick,
}: CommentPinProps) {
  return (
    <div
      style={{ left: `${x}%`, top: `${y}%` }}
      className="absolute"
    >
      <button
        onClick={() => onClick(id)}
        aria-label={`Comment by ${authorName}: ${content.slice(0, 50)}`}
        aria-pressed={isSelected}
        className={[
          "relative flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center",
          "rounded-full border-2 border-white text-xs font-bold text-white shadow-md",
          "transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
          "hover:scale-110",
          isSelected ? "bg-brand-600 scale-110" : "bg-brand-500",
        ].join(" ")}
      >
        <svg aria-hidden="true" className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isSelected && (
        <div
          role="tooltip"
          className="absolute left-8 top-0 z-10 w-56 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
        >
          <p className="text-xs font-semibold text-gray-700">{authorName}</p>
          <p className="mt-1 text-sm text-gray-900">{content}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create `apps/web/src/components/share-viewer.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CommentPin } from "@/components/comment-pin";

interface Comment {
  id: string;
  page_number: number;
  x_position: number;
  y_position: number;
  content: string;
  author_name: string;
  created_at: string;
}

interface ShareViewerProps {
  token: string;
  projectName: string;
  pageCount: number;
  permissions: "view" | "comment";
  initialComments: Comment[];
}

export function ShareViewer({
  token,
  projectName,
  pageCount,
  permissions,
  initialComments,
}: ShareViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [commentText, setCommentText] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  const pageComments = comments.filter((c) => c.page_number === currentPage);

  function handlePreviewClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!isAddingComment || !permissions) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPin({ x, y });
  }

  async function submitComment() {
    if (!pendingPin || !commentText.trim() || !authorName.trim()) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/v1/share/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: commentText.trim(),
          author_name: authorName.trim(),
          page_number: currentPage,
          x_position: pendingPin.x,
          y_position: pendingPin.y,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        setComments((prev) => [...prev, json.data]);
        setPendingPin(null);
        setCommentText("");
        setIsAddingComment(false);
      }
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function handleApprove() {
    if (!authorName.trim()) {
      setApproveError("Please enter your name to approve.");
      return;
    }

    setIsApproving(true);
    setApproveError(null);

    try {
      const res = await fetch(`/api/v1/share/${token}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved_by: authorName.trim() }),
      });

      if (res.ok) {
        setIsApproved(true);
      } else {
        const json = await res.json().catch(() => ({}));
        setApproveError(json.error?.message ?? "Approval failed. Please try again.");
      }
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Review Request
          </p>
          <h1 className="text-lg font-semibold text-gray-900">{projectName}</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-brand-500 font-medium">
            TypeSet AI
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Page preview */}
        <main className="flex flex-1 flex-col">
          {/* Preview */}
          <div
            className={[
              "relative flex flex-1 items-center justify-center p-6",
              isAddingComment ? "cursor-crosshair" : "",
            ].join(" ")}
            onClick={handlePreviewClick}
            aria-label={
              isAddingComment
                ? "Click on the page to place your comment"
                : `Page ${currentPage} of ${pageCount}`
            }
          >
            <div className="relative aspect-[3/4] h-full max-h-[calc(100vh-220px)] bg-white shadow-xl rounded-sm">
              {/* Page content placeholder */}
              <div className="flex h-full items-center justify-center text-gray-200">
                <p className="text-sm">Page {currentPage}</p>
              </div>

              {/* Comment pins */}
              {pageComments.map((comment) => (
                <CommentPin
                  key={comment.id}
                  id={comment.id}
                  x={comment.x_position}
                  y={comment.y_position}
                  authorName={comment.author_name}
                  content={comment.content}
                  isSelected={selectedCommentId === comment.id}
                  onClick={(id) =>
                    setSelectedCommentId((prev) => (prev === id ? null : id))
                  }
                />
              ))}

              {/* Pending pin */}
              {pendingPin && (
                <div
                  style={{ left: `${pendingPin.x}%`, top: `${pendingPin.y}%` }}
                  aria-hidden="true"
                  className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400 border-2 border-white shadow-md animate-pulse"
                />
              )}
            </div>
          </div>

          {/* Page nav */}
          <nav
            aria-label="Page navigation"
            className="flex shrink-0 items-center justify-center gap-4 border-t border-gray-200 bg-white py-3"
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-label="Previous page"
            >
              Prev
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {pageCount}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
              disabled={currentPage >= pageCount}
              aria-label="Next page"
            >
              Next
            </Button>
          </nav>
        </main>

        {/* Sidebar */}
        <aside
          aria-label="Review sidebar"
          className="flex w-80 shrink-0 flex-col border-l border-gray-200 bg-white"
        >
          <div className="flex flex-col gap-4 overflow-y-auto flex-1 p-4">
            {/* Your name */}
            <Input
              label="Your Name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="e.g. Jane Smith"
            />

            {/* Comment controls */}
            {permissions === "comment" && (
              <div className="flex flex-col gap-2">
                <Button
                  variant={isAddingComment ? "secondary" : "primary"}
                  onClick={() => {
                    setIsAddingComment((prev) => !prev);
                    setPendingPin(null);
                  }}
                >
                  {isAddingComment ? "Cancel" : "Add Comment"}
                </Button>

                {pendingPin && (
                  <div className="flex flex-col gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                    <p className="text-xs font-medium text-yellow-700">
                      Comment placed. Add your note:
                    </p>
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Type your comment..."
                      rows={3}
                      aria-label="Comment text"
                      className="resize-none rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <Button
                      size="sm"
                      onClick={submitComment}
                      isLoading={isSubmittingComment}
                      disabled={!commentText.trim() || !authorName.trim()}
                    >
                      Post Comment
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Comments list */}
            <div>
              <h2 className="mb-2 text-sm font-semibold text-gray-700">
                Comments ({pageComments.length})
              </h2>
              {pageComments.length === 0 ? (
                <p className="text-sm text-gray-400">No comments on this page.</p>
              ) : (
                <ul aria-label="Comments" className="space-y-3">
                  {pageComments.map((comment) => (
                    <li
                      key={comment.id}
                      className={[
                        "rounded-lg border p-3 cursor-pointer transition-colors",
                        selectedCommentId === comment.id
                          ? "border-brand-300 bg-brand-50"
                          : "border-gray-200 hover:border-gray-300",
                      ].join(" ")}
                      onClick={() =>
                        setSelectedCommentId((prev) =>
                          prev === comment.id ? null : comment.id
                        )
                      }
                    >
                      <p className="text-xs font-semibold text-gray-600">
                        {comment.author_name}
                      </p>
                      <p className="mt-1 text-sm text-gray-900">{comment.content}</p>
                      <time
                        dateTime={comment.created_at}
                        className="mt-1 block text-xs text-gray-400"
                      >
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(comment.created_at))}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Approve section */}
          <div className="shrink-0 border-t border-gray-200 p-4">
            {isApproved ? (
              <div
                role="status"
                className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 text-center font-medium"
              >
                Approved — thank you!
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {approveError && (
                  <p role="alert" className="text-xs text-red-600">{approveError}</p>
                )}
                <Button
                  variant="primary"
                  onClick={handleApprove}
                  isLoading={isApproving}
                  disabled={!authorName.trim()}
                  className="w-full"
                >
                  Approve Proof
                </Button>
                <p className="text-center text-xs text-gray-400">
                  Clicking approve marks this proof as accepted.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create `apps/web/src/app/share/[token]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { ShareViewer } from "@/components/share-viewer";
import type { Metadata } from "next";
import type { DbComment } from "@/lib/supabase/types";

interface PageProps {
  params: { token: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const db = createServerClient();
  const { data: shareLink } = await db
    .from("share_links")
    .select("project_id")
    .eq("token", params.token)
    .single();

  if (!shareLink) return { title: "Not Found" };

  const { data: project } = await db
    .from("projects")
    .select("name")
    .eq("id", shareLink.project_id)
    .single();

  return {
    title: project ? `Review: ${project.name}` : "Proof Review",
    robots: { index: false, follow: false },
  };
}

export default async function ShareViewerPage({ params }: PageProps) {
  const db = createServerClient();

  const { data: shareLink } = await db
    .from("share_links")
    .select("id, project_id, permissions, expires_at")
    .eq("token", params.token)
    .single();

  if (!shareLink) notFound();

  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-xl bg-white p-8 shadow-sm text-center max-w-sm mx-auto">
          <p className="text-lg font-semibold text-gray-900">Link Expired</p>
          <p className="mt-2 text-sm text-gray-500">
            This review link has expired. Please request a new link from the project team.
          </p>
        </div>
      </div>
    );
  }

  const [{ data: project }, { data: comments }] = await Promise.all([
    db.from("projects").select("name, page_count").eq("id", shareLink.project_id).single(),
    db
      .from("comments")
      .select("id, page_number, x_position, y_position, content, author_name, created_at")
      .eq("project_id", shareLink.project_id)
      .eq("resolved", false)
      .order("created_at", { ascending: true }),
  ]);

  if (!project) notFound();

  return (
    <ShareViewer
      token={params.token}
      projectName={project.name}
      pageCount={project.page_count ?? 1}
      permissions={shareLink.permissions as "view" | "comment"}
      initialComments={(comments ?? []) as DbComment[]}
    />
  );
}
```

**Commit:** `feat(web): add share links, public proof viewer, pin-drop comments, and client approval`

---

## Task 10: Team Management & Templates Pages

**Files to create:**
- `apps/web/src/app/(dashboard)/team/page.tsx`
- `apps/web/src/app/(dashboard)/templates/page.tsx`

- [ ] **Step 1: Create `apps/web/src/app/(dashboard)/team/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { createServerClient } from "@/lib/supabase/server";
import { TeamPageClient } from "./team-page-client";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const session = await auth();

  if (!session?.user || !hasRole(session.user.role, "admin")) {
    redirect("/projects");
  }

  const db = createServerClient();
  const { data: users } = await db
    .from("users")
    .select("id, email, name, avatar_url, role, is_active, created_at")
    .order("created_at", { ascending: true });

  return <TeamPageClient users={users ?? []} currentUserId={session.user.id} />;
}
```

Create `apps/web/src/app/(dashboard)/team/team-page-client.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { DbUser, UserRole } from "@/lib/supabase/types";

const ROLE_OPTIONS = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "admin", label: "Admin" },
];

const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-700",
  editor: "bg-blue-100 text-blue-700",
  viewer: "bg-gray-100 text-gray-600",
};

interface TeamPageClientProps {
  users: DbUser[];
  currentUserId: string;
}

export function TeamPageClient({ users, currentUserId }: TeamPageClientProps) {
  const router = useRouter();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("viewer");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const res = await fetch("/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      const json = await res.json();

      if (!res.ok) {
        setInviteError(json.error?.message ?? "Failed to invite user.");
        return;
      }

      setInviteSuccess(`${inviteEmail} has been added to the team.`);
      setInviteEmail("");
      router.refresh();
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    setUpdatingUserId(userId);
    try {
      await fetch(`/api/v1/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      router.refresh();
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleDeactivate(userId: string, isActive: boolean) {
    setUpdatingUserId(userId);
    try {
      await fetch(`/api/v1/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      router.refresh();
    } finally {
      setUpdatingUserId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Team</h1>

      {/* Invite form */}
      <section aria-labelledby="invite-heading" className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 id="invite-heading" className="mb-4 text-base font-semibold text-gray-900">
          Invite Team Member
        </h2>
        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3" noValidate>
          <div className="flex-1 min-w-48">
            <Input
              label="Email Address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              required
              error={inviteError ?? undefined}
            />
          </div>
          <Select
            label="Role"
            options={ROLE_OPTIONS}
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as UserRole)}
            className="w-36"
          />
          <Button type="submit" isLoading={isInviting} className="self-end">
            Invite
          </Button>
        </form>
        {inviteSuccess && (
          <p role="status" className="mt-3 text-sm text-green-600">
            {inviteSuccess}
          </p>
        )}
      </section>

      {/* User list */}
      <section aria-labelledby="team-members-heading">
        <h2 id="team-members-heading" className="mb-3 text-base font-semibold text-gray-900">
          Members ({users.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm" aria-label="Team members">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500">
                  Member
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500">
                  Role
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => {
                const isCurrentUser = user.id === currentUserId;
                const isUpdating = updatingUserId === user.id;

                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={user.avatar_url} name={user.name} size="sm" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.name ?? "—"}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-gray-400">(you)</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isCurrentUser ? (
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            ROLE_BADGE_CLASSES[user.role],
                          ].join(" ")}
                        >
                          {user.role}
                        </span>
                      ) : (
                        <Select
                          aria-label={`Change role for ${user.name ?? user.email}`}
                          options={ROLE_OPTIONS}
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(user.id, e.target.value as UserRole)
                          }
                          disabled={isUpdating}
                          className="w-28 text-xs"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.is_active ? "default" : "archived"}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isCurrentUser && (
                        <Button
                          variant={user.is_active ? "danger" : "secondary"}
                          size="sm"
                          isLoading={isUpdating}
                          onClick={() => handleDeactivate(user.id, user.is_active)}
                          aria-label={`${user.is_active ? "Deactivate" : "Reactivate"} ${user.name ?? user.email}`}
                        >
                          {user.is_active ? "Deactivate" : "Reactivate"}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/src/app/(dashboard)/templates/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { DbTemplate } from "@/lib/supabase/types";

const BOOK_TYPE_OPTIONS = [
  { value: "novel", label: "Novel" },
  { value: "non_fiction", label: "Non-fiction" },
  { value: "children", label: "Children's" },
  { value: "academic", label: "Academic" },
  { value: "poetry", label: "Poetry" },
  { value: "comic", label: "Comic" },
  { value: "other", label: "Other" },
];

const TEMPLATE_ICON = (
  <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
  </svg>
);

interface TemplateResponse {
  data: DbTemplate[];
}

async function fetchTemplates(url: string): Promise<TemplateResponse> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load templates");
  return res.json();
}

export default function TemplatesPage() {
  const { data, error, isLoading, mutate } = useSWR<TemplateResponse>(
    "/api/v1/templates",
    fetchTemplates
  );
  const [selectedTemplate, setSelectedTemplate] = useState<DbTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBookType, setNewBookType] = useState("novel");
  const [cssContent, setCssContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !cssContent.trim()) return;

    setIsSubmitting(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/v1/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          book_type: newBookType,
          css_content: cssContent.trim(),
          is_system: false,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setCreateError(json.error?.message ?? "Failed to create template.");
        return;
      }

      setIsCreating(false);
      setNewName("");
      setCssContent("");
      mutate();
    } finally {
      setIsSubmitting(false);
    }
  }

  const templates = data?.data ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
        <Button onClick={() => setIsCreating(true)}>
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Template
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Spinner size="lg" label="Loading templates..." />
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load templates.
        </div>
      )}

      {!isLoading && !error && templates.length === 0 && (
        <EmptyState
          icon={TEMPLATE_ICON}
          title="No templates yet"
          description="Create a reusable CSS layout template for common book types."
          action={<Button onClick={() => setIsCreating(true)}>Create a template</Button>}
        />
      )}

      {templates.length > 0 && (
        <ul
          role="list"
          aria-label="Templates"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {templates.map((template) => (
            <li key={template.id}>
              <button
                onClick={() => setSelectedTemplate(template)}
                className="group w-full flex flex-col rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <div
                  aria-hidden="true"
                  className="mb-4 h-24 w-full overflow-hidden rounded-lg bg-gray-900"
                >
                  <pre className="p-2 text-[10px] text-gray-400 leading-relaxed overflow-hidden">
                    <code>{template.css_content.slice(0, 200)}</code>
                  </pre>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-brand-600">
                  {template.name}
                  {template.is_system && (
                    <span className="ml-2 text-xs text-gray-400 font-normal">(System)</span>
                  )}
                </h3>
                <p className="mt-1 text-xs text-gray-500">{template.book_type}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Create modal */}
      <Modal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        title="New Template"
        size="lg"
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4" noValidate>
          {createError && (
            <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
              {createError}
            </div>
          )}
          <Input
            label="Template Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Literary Novel"
            required
            autoFocus
          />
          <Select
            label="Book Type"
            options={BOOK_TYPE_OPTIONS}
            value={newBookType}
            onChange={(e) => setNewBookType(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="css-editor" className="text-sm font-medium text-gray-700">
              CSS Content
            </label>
            <textarea
              id="css-editor"
              value={cssContent}
              onChange={(e) => setCssContent(e.target.value)}
              placeholder="/* Paste or write your CSS layout here */"
              rows={10}
              required
              className="rounded-md border border-gray-300 px-3 py-2 font-mono text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Template
            </Button>
          </div>
        </form>
      </Modal>

      {/* Preview modal */}
      {selectedTemplate && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedTemplate(null)}
          title={selectedTemplate.name}
          size="lg"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{selectedTemplate.book_type}</span>
              {selectedTemplate.is_system && (
                <span className="text-xs text-gray-400">· System template</span>
              )}
            </div>
            {selectedTemplate.description && (
              <p className="text-sm text-gray-700">{selectedTemplate.description}</p>
            )}
            <pre className="max-h-96 overflow-auto rounded-lg border border-gray-200 bg-gray-900 p-4 text-xs text-gray-100 font-mono">
              <code>{selectedTemplate.css_content}</code>
            </pre>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedTemplate(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
```

**Commit:** `feat(web): add team management page and templates page with CSS editor`

---

## Dependency Note

Add `"swr": "2.2.5"` to `apps/web/package.json`. This is needed by the Projects page and Templates page for client-side data fetching.

```bash
pnpm --filter @typeset-ai/web add swr@2.2.5
```

SWR is maintained by Vercel, has 28k+ stars, zero heavy transitive dependencies, and is the standard data-fetching library for Next.js client components.

---

## Implementation Order

Implement tasks in this order to unlock dependencies:
1. Task 1 (UI components) — everything else depends on these
2. Task 2 (Sidebar) — needed by the layout
3. Task 6 (Chat API) + Task 8 (Export API) — can run in parallel
4. Task 5 (Chat Panel) + Task 7 (Export Panel) — depends on Tasks 1 + 3/4
5. Task 3 (Projects List) + Task 4 (Workspace) — can run in parallel
6. Task 9 (Share Links) — self-contained
7. Task 10 (Team + Templates) — self-contained

---

## Accessibility Checklist

- All interactive elements reachable via Tab in logical order
- Focus trapping in Modal component with Escape-to-close
- `aria-live="polite"` on chat message list for dynamic updates
- `aria-label` on all icon-only buttons (Undo, Redo, Attach image, Close)
- Semantic `<table>` with `<thead>`, `<th scope="col">` in Team page
- `<nav aria-label>` for sidebar and page navigation
- `role="tablist"` / `role="tab"` / `role="tabpanel"` in WorkspaceTabs
- Color contrast: brand-500 (#4f6ef7) on white = 3.1:1 (passes WCAG AA for large text and UI components); brand-600 (#3d5be0) on white = 4.6:1 (passes for normal text)
- `prefers-reduced-motion` respected by avoiding CSS animation beyond the spinner
- Empty `alt=""` for decorative thumbnail placeholder in ProjectCard
- All form fields have visible `<label>` elements

---

## Key Architectural Notes

1. **Session store for chat:** The in-memory `SESSION_STORE` in the chat route is a singleton within a Node.js process. This works fine for local dev and single-instance deploys. For multi-instance production, replace with a Redis-backed store using `ioredis` or Upstash. The key is `projectId`.

2. **File exports via tmp directory:** All export routes write to `os.tmpdir()` and clean up in `finally` blocks. For serverless (Vercel), this works because each invocation gets ephemeral `/tmp` storage. For large files, consider streaming directly from the core function instead of buffering.

3. **Share viewer has no auth:** The `/share/[token]` page and its API routes are intentionally public. The middleware has been updated to whitelist these paths. The token itself is the access control mechanism (24 random bytes = 192 bits of entropy).

4. **Viewer is a Server Component:** `ShareViewerPage` pre-fetches project data and comments server-side, then passes them as props to the `ShareViewer` Client Component for interactive pin-drop commenting.

5. **SWR on projects/templates pages:** These pages are client-rendered because they need `useSearchParams()` for filter state. SWR handles the fetch, loading, and error states.
