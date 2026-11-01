"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** A password field with a show / hide button.  It hides again on submit, so a password never leaves as plain text
 *  on screen after the form has gone.  ``-ms-reveal`` drops Edge's own eye, which would otherwise sit beside this one. */
const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, "type">>(
  ({ className, ...props }, ref) => {
    const [shown, setShown] = React.useState(false);
    const inner = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
      const form = inner.current?.form;
      if (!form) return;
      const hide = () => setShown(false);
      form.addEventListener("submit", hide);
      return () => form.removeEventListener("submit", hide);
    }, []);

    return (
      <div className="relative">
        <Input
          {...props}
          ref={(node) => {
            inner.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          type={shown ? "text" : "password"}
          className={cn("pr-10 [&::-ms-reveal]:hidden", className)}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          disabled={props.disabled}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          title={shown ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
