// jsdom lacks CSS.escape, which React Aria's overlays use.
if (typeof window !== 'undefined' && !(globalThis as { CSS?: { escape?: unknown } }).CSS?.escape) {
  (globalThis as unknown as { CSS: { escape: (s: string) => string } }).CSS = { escape: (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`) };
}
