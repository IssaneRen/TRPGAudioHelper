export function Figure({
  kind,
  caption,
}: {
  kind: 'curve' | 'specimen' | 'rings'
  caption?: string
}) {
  return (
    <figure className="reader-figure">
      {kind === 'curve' && (
        <svg viewBox="0 0 520 230" className="figure-svg" role="img" aria-label="缓动曲线示意">
          <defs>
            <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3f6b4f" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#3f6b4f" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <line
              key={`h${row}`}
              x1="46"
              x2="484"
              y1={34 + row * 32}
              y2={34 + row * 32}
              stroke="currentColor"
              strokeOpacity="0.08"
            />
          ))}
          {[0, 1, 2, 3, 4, 5, 6].map((col) => (
            <line
              key={`v${col}`}
              x1={46 + col * 73}
              x2={46 + col * 73}
              y1="34"
              y2="194"
              stroke="currentColor"
              strokeOpacity="0.06"
            />
          ))}
          <line x1="46" y1="194" x2="484" y2="194" stroke="currentColor" strokeOpacity="0.25" />
          <line x1="46" y1="34" x2="46" y2="194" stroke="currentColor" strokeOpacity="0.25" />
          <path
            d="M46 194 C 160 194, 190 50, 300 44 S 430 70, 484 40"
            fill="none"
            stroke="#3f6b4f"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M46 194 C 160 194, 190 50, 300 44 S 430 70, 484 40 L 484 194 Z"
            fill="url(#curveFill)"
          />
          <circle cx="300" cy="44" r="4.5" fill="#3f6b4f" />
          <text x="300" y="30" textAnchor="middle" className="figure-label" fill="currentColor">
            ease-out
          </text>
          <text x="460" y="214" textAnchor="end" className="figure-axis" fill="currentColor">
            time
          </text>
          <text x="38" y="44" textAnchor="end" className="figure-axis" fill="currentColor">
            value
          </text>
        </svg>
      )}

      {kind === 'specimen' && (
        <div className="figure-specimen" aria-label="行距对比示意">
          <div className="specimen-row specimen-row--tight">
            <span className="specimen-label">紧凑</span>
            <p>文字安静下来，才听得见自己的想法。</p>
          </div>
          <div className="specimen-row specimen-row--calm">
            <span className="specimen-label">适中</span>
            <p>文字安静下来，才听得见自己的想法。</p>
          </div>
          <div className="specimen-row specimen-row--airy">
            <span className="specimen-label">舒展</span>
            <p>文字安静下来，才听得见自己的想法。</p>
          </div>
        </div>
      )}

      {kind === 'rings' && (
        <div className="figure-rings" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((ring) => (
            <span key={ring} style={{ width: 80 + ring * 34, height: 80 + ring * 34 }} />
          ))}
        </div>
      )}

      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}
