"use client";

import type { Metric } from "web-vitals";
import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";

function sendToVitalsEndpoint(metric: Metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/health/vitals", body);
  } else {
    fetch("/api/health/vitals", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    });
  }
}

export function reportWebVitals() {
  onCLS(sendToVitalsEndpoint);
  onFCP(sendToVitalsEndpoint);
  onINP(sendToVitalsEndpoint);
  onLCP(sendToVitalsEndpoint);
  onTTFB(sendToVitalsEndpoint);
}
