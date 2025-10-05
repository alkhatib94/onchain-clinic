// app/components/ErrorBoundary.tsx
"use client";

import React from "react";

type Props = {
  name?: string;        // اسم القسم للمساعدة بالتشخيص
  children: React.ReactNode;
};

type State = { hasError: boolean; error?: any };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: React.ErrorInfo) {
    // اطبع معلومات تفصيلية في الـConsole لمعرفة الملف/السطر
    // سيظهر stacktrace فيه اسم الملف الذي سبب .map على undefined
    console.error(`[ErrorBoundary:${this.props.name || "section"}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || String(this.state.error || "Unknown error");
      return (
        <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm">
          <div className="font-semibold mb-1">
            {this.props.name ? `Section "${this.props.name}" crashed` : "Section crashed"}
          </div>
          <div className="opacity-80 break-all">{msg}</div>
          <div className="opacity-60 mt-1">
            Open Console to see the exact component/stack (file:line).
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
