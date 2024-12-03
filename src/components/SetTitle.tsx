"use client";

import { useEffect } from "react";

export default function SetTitle({ title }: { title: string }) {
  useEffect(() => {
    if (title) {
      document.title = title;
    }
  }, [title]);

  return null; // This component doesn't render anything
}
