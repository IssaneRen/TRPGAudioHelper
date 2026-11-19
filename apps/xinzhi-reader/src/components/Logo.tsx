import { Link } from 'react-router-dom'

export function LeafMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden="true"
      className="leaf-mark"
    >
      <path
        d="M22 36V21.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M21.8 26.4c-6.6 0-10.8-4.2-10.8-10.5 6.6 0 10.8 4.1 10.8 10.5Z"
        fill="currentColor"
      />
      <path
        d="M22.2 20.6c0-6 3.9-10.1 10.4-10.1 0 6.1-4 10.1-10.4 10.1Z"
        fill="currentColor"
        opacity="0.55"
      />
    </svg>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="brand" aria-label="新枝 · 返回阅读流">
      <span className="brand-mark">
        <LeafMark size={24} />
      </span>
      {!compact && (
        <span className="brand-text">
          <span className="brand-name">新枝</span>
          <span className="brand-sub">一个保护注意力的空间</span>
        </span>
      )}
    </Link>
  )
}
