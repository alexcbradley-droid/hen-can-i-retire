// Brand mark: ascending steps reaching a sunrise horizon — growth that ends
// in a comfortable retirement. Inline SVG so it inherits no external assets.

export default function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="7" fill="#0B3D2E" />
      <circle cx="22" cy="10" r="3.6" fill="#F3C577" />
      <path
        d="M5 25h5v-5h5v-5h5v-5h7"
        stroke="#7FD1B9"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
