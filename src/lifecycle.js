// src/lifecycle.js
export function observeSize(el, onResize, RO = globalThis.ResizeObserver) {
  if (!RO) { return () => {}; }
  const ro = new RO(() => onResize());
  ro.observe(el);
  return () => ro.disconnect();
}

export function observeVisibility(el, onChange, IO = globalThis.IntersectionObserver) {
  if (!IO) { onChange(true); return () => {}; } // assume visible if unsupported
  const io = new IO((entries) => onChange(entries[entries.length - 1].isIntersecting));
  io.observe(el);
  return () => io.disconnect();
}
