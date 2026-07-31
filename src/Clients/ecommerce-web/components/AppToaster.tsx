"use client";

import { useEffect } from "react";
import { getNotifications } from "@/lib/notifications";
import "@/app/notifications.css";

/** Custom sağ-üst toast sistemini başlatır (alert yerine). */
export default function AppToaster() {
  useEffect(() => {
    getNotifications().init();
  }, []);

  return null;
}
