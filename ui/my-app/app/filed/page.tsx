"use client";

import { Suspense } from "react";
import FiledView from "@/views/FiledView";

export default function Filed() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <FiledView />
    </Suspense>
  );
}
