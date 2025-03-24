import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, XCircle } from "lucide-react";

const notificationVariants = cva(
  "fixed bottom-4 right-4 bg-white rounded-lg shadow-lg max-w-sm p-4 border-l-4 flex z-50",
  {
    variants: {
      variant: {
        success: "border-primaryGreen",
        error: "border-errorRed",
        info: "border-accentBluePurple",
      },
    },
    defaultVariants: {
      variant: "success",
    },
  }
);

export interface NotificationProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof notificationVariants> {
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

const Notification = React.forwardRef<HTMLDivElement, NotificationProps>(
  (
    {
      className,
      variant,
      message,
      onClose,
      autoClose = true,
      duration = 3000,
      ...props
    },
    ref
  ) => {
    React.useEffect(() => {
      if (autoClose) {
        const timer = setTimeout(() => {
          if (onClose) onClose();
        }, duration);
        return () => clearTimeout(timer);
      }
    }, [autoClose, duration, onClose]);

    const IconComponent = React.useMemo(() => {
      switch (variant) {
        case "success":
          return CheckCircle;
        case "error":
          return XCircle;
        case "info":
          return AlertCircle;
        default:
          return CheckCircle;
      }
    }, [variant]);

    return (
      <div
        className={cn(notificationVariants({ variant }), className)}
        ref={ref}
        {...props}
      >
        <div className="flex-shrink-0">
          <IconComponent
            className={cn("h-5 w-5", {
              "text-primaryGreen": variant === "success",
              "text-errorRed": variant === "error",
              "text-accentBluePurple": variant === "info",
            })}
          />
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-neutralGray-900">{message}</p>
        </div>
      </div>
    );
  }
);

Notification.displayName = "Notification";

export { Notification, notificationVariants };
