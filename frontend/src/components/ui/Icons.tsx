// Small inline SVG icon set matching the Figma design — kept dependency-free.
import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const ChevronDownIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ClockIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
);

export const SendIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m3 11 18-8-8 18-2-8-8-2Z" />
  </svg>
);

export const SearchIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const FilterIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 5h16M7 12h10M10 19h4" />
  </svg>
);

export const RefreshIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v6h-6" />
  </svg>
);

export const StarIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m12 3 2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 17l-5.6 3.1 1.4-6.3-4.8-4.3 6.4-.6L12 3Z" />
  </svg>
);

export const PaperclipIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M21.4 11.1 12.3 20.2a5 5 0 0 1-7.1-7.1l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-2.8-2.8l8-8" />
  </svg>
);

export const UploadIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
  </svg>
);

export const ArrowLeftIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

export const CloseIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3c-7.5 0-14 4.2-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 36.2 26.7 37 24 37c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.9 40.7 16.4 45 24 45z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.2 5.2C40.9 36 44 30.6 44 24c0-1.4-.1-2.7-.4-3.5z" />
    </svg>
  );
}

// Decorative rich-text toolbar glyphs (non-functional, purely visual to match Figma)
export const UndoIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M3 7v6h6M3 13a9 9 0 1 0 3-6.7" />
  </svg>
);
export const RedoIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M21 7v6h-6M21 13a9 9 0 1 1-3-6.7" />
  </svg>
);
export const BoldIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M6 4h7a3.5 3.5 0 0 1 0 7H6zM6 11h8a3.5 3.5 0 0 1 0 7H6z" />
  </svg>
);
export const ItalicIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M10 4h6M4 20h6M14 4 8 20" />
  </svg>
);
export const UnderlineIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M6 4v6a6 6 0 0 0 12 0V4M4 20h16" />
  </svg>
);
export const ListIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);
export const NumberedListIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M10 6h11M10 12h11M10 18h11M4 6h1v3M4 10h2M4 14a1 1 0 1 1 1.7.7L4 17h2.5" />
  </svg>
);
export const AlignIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 6h16M4 12h10M4 18h13" />
  </svg>
);
export const AlignJustifyIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
export const ChevronUpDownIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
  </svg>
);
export const IndentIncreaseIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 6h16M10 12h10M4 18h16M4 9l4 3-4 3" />
  </svg>
);
export const IndentDecreaseIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 6h16M10 12h10M4 18h16M8 9 4 12l4 3" />
  </svg>
);
export const QuoteIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M7 8a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3M17 8a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3" />
  </svg>
);
export const StrikethroughIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M6 5h9.5a3 3 0 0 1 0 6M8 19h7.5a3 3 0 0 0 2-5.3M3 12h18" />
  </svg>
);
export const FontSizeIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M3 18 8 6l5 12M4.5 14h7M14 8h4l-3.5 5H18l-4 5" />
  </svg>
);
