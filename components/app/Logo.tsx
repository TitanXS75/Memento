import type { SVGProps } from 'react'

interface LogoProps extends SVGProps<SVGSVGElement> {
  frameColor?: string
  buttonColor?: string
}

export function Logo({
  className = 'size-6',
  frameColor = 'currentColor',
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

      {/* Viewfinder dot (top-right) */}
      <circle
        cx="23.5"
        cy="11.5"
        r="1.2"
        fill={frameColor}
      />

      {/* Outer camera lens ring */}
      <circle
        cx="16"
        cy="16.75"
        r="5.25"
        stroke={frameColor}
        strokeWidth="1.8"
      />

      {/* Inner camera lens core */}
      <circle
        cx="16"
        cy="16.75"
        r="2.5"
        fill={frameColor}
      />

      {/* Subtle lens reflection highlight */}
      <circle
        cx="17.2"
        cy="15.5"
        r="0.75"
        fill="currentColor"
        className="opacity-40"
      />
    </svg>
  )
}
