import type { SVGProps } from 'react'

interface LogoProps extends SVGProps<SVGSVGElement> {
  frameColor?: string
  faceColor?: string
  buttonColor?: string
}

export function Logo({
  className = 'size-6',
  frameColor = 'currentColor',
  faceColor = 'currentColor',
  buttonColor = '#ef4444',
  ...props
}: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Camera shutter button (red) */}
      <rect
        x="7"
        y="5"
        width="4.5"
        height="2"
        rx="1"
        fill={buttonColor}
      />

      {/* Camera chassis */}
      <rect
        x="3.5"
        y="7.5"
        width="25"
        height="18.5"
        rx="4.5"
        stroke={frameColor}
        strokeWidth="1.8"
      />

      {/* Left eye (^) */}
      <path
        d="M7.5 15.5L9.5 12.8L11.5 15.5"
        stroke={faceColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Smile mouth (‿) placed below */}
      <path
        d="M13.5 19.2Q16 22.2 18.5 19.2"
        stroke={faceColor}
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Right eye (^) */}
      <path
        d="M20.5 15.5L22.5 12.8L24.5 15.5"
        stroke={faceColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
