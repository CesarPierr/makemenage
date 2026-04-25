"use client";

import { useUxEvent } from "@/lib/use-ux-event";

type UxEventTrackerProps = {
  event: string;
  props?: Record<string, unknown>;
};

export function UxEventTracker({ event, props }: UxEventTrackerProps) {
  useUxEvent(event, props);
  return null;
}
