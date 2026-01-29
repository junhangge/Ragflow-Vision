import clsx from "clsx";
export function cn(...args) { return clsx(args); }

export function fmtTs(ts) {
  try {
    return new Date(ts * 1000).toLocaleString();
  } catch { return ""; }
}

export function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
