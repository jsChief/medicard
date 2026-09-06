"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const RadixToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-100 flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-105",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & {
  variant?: "default" | "success" | "error" | "warning" | "info" | "loading"
  title?: string
  description?: string
  action?: React.ReactNode
  onClose?: () => void
}

const Toast = React.forwardRef<React.ElementRef<typeof ToastPrimitives.Root>, ToastProps>(
  ({ className, variant = "default", title, description, action, onClose, ...props }, ref) => {
    const icons = {
      default: null,
      success: CheckCircle,
      error: AlertCircle,
      warning: AlertTriangle,
      info: Info,
      loading: Loader2,
    }

    const iconColors = {
      default: "text-text",
      success: "text-success",
      error: "text-danger",
      warning: "text-warning",
      info: "text-primary",
      loading: "text-primary animate-spin",
    }

    const borderColors = {
      default: "border-border",
      success: "border-success/30",
      error: "border-danger/30",
      warning: "border-warning/30",
      info: "border-primary/30",
      loading: "border-primary/30",
    }

    const bgColors = {
      default: "bg-surface",
      success: "bg-success/95",
      error: "bg-danger/95",
      warning: "bg-warning/95",
      info: "bg-primary/95",
      loading: "bg-primary/95",
    }

    const Icon = icons[variant]

    return (
      <ToastPrimitives.Root
        ref={ref}
        className={cn(
          "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-4 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-(--radix-toast-swipe-end-x) data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
          bgColors[variant],
          borderColors[variant],
          className
        )}
        {...props}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {Icon && (
            <div className={cn("shrink-0 h-5 w-5", iconColors[variant])}>
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {title && (
              <div className="text-sm font-medium text-white">{title}</div>
            )}
            {description && (
              <div className="text-sm text-white/90 mt-0.5">{description}</div>
            )}
          </div>
          {action && (
            <div className="shrink-0 ml-4">{action}</div>
          )}
        </div>
        <ToastPrimitives.Close
          className={cn(
            "absolute right-2 top-2 rounded-md p-1 text-white/60 opacity-0 transition-opacity hover:text-white focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100",
            "sm:text-white/40"
          )}
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </ToastPrimitives.Close>
      </ToastPrimitives.Root>
    )
  }
)
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn("inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-surface transition-colors hover:bg-bg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", className)}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn("absolute right-2 top-2 rounded-md p-1 text-text-muted/50 opacity-0 transition-opacity hover:text-text-muted focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100", className)}
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

interface ToastOptions {
  title?: string
  description?: string
  variant?: "default" | "success" | "error" | "warning" | "info" | "loading"
  duration?: number
  action?: React.ReactNode
  onClose?: () => void
}

interface ToastState {
  toasts: Array<ToastOptions & { id: string }>
  addToast: (options: ToastOptions) => string
  dismiss: (id: string) => void
  dismissAll: () => void
}

const ToastContext = React.createContext<ToastState | null>(null)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

// Global toast state registry
let globalToastState: ToastState | null = null

function __registerToastState(state: ToastState | null) {
  globalToastState = state
}

export function toast(options: ToastOptions): string {
  if (globalToastState) {
    return globalToastState.addToast(options)
  }
  // Fallback: show native alert if toast system not initialized
  console.warn("Toast system not initialized, falling back to console")
  console.log(`[${options.variant?.toUpperCase() || "INFO"}] ${options.title}: ${options.description}`)
  return ""
}

export function dismissToast(id: string) {
  if (globalToastState) {
    globalToastState.dismiss(id)
  }
}

export function dismissAllToasts() {
  if (globalToastState) {
    globalToastState.dismissAll()
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Array<ToastOptions & { id: string }>>([])

  const addToast = React.useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { ...options, id }
    setToasts((prev) => [...prev, newToast])

    if (options.duration !== 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, options.duration ?? 5000)
    }

    return id
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const dismissAll = React.useCallback(() => {
    setToasts([])
  }, [])

  // Register the current toast state for global access after render.
  React.useEffect(() => {
    const state: ToastState = {
      toasts,
      addToast,
      dismiss,
      dismissAll,
    }
    __registerToastState(state)
    return () => __registerToastState(null)
  }, [toasts, addToast, dismiss, dismissAll])

  const value = React.useMemo(() => ({ 
    toasts, 
    addToast, 
    dismiss, 
    dismissAll 
  }), [toasts, addToast, dismiss, dismissAll])

  return (
    <RadixToastProvider>
      <ToastContext.Provider value={value}>
        {children}
        <ToastViewport>
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              variant={toast.variant}
              title={toast.title}
              description={toast.description}
              action={toast.action}
              onClose={() => dismiss(toast.id)}
            />
          ))}
        </ToastViewport>
      </ToastContext.Provider>
    </RadixToastProvider>
  )
}

export { Toast, ToastAction, ToastClose, ToastViewport, __registerToastState }