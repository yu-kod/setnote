import * as React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

// このアプリはダーク固定（html.dark）のため next-themes は使わず theme を固定する。
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
