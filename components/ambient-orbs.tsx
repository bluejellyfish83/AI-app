'use client'

export function AmbientOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      {/* Orb 1 — indigo, top-left quadrant */}
      <div
        className="orb"
        style={{
          width: '55vmax',
          height: '55vmax',
          top: '-18vmax',
          left: '-14vmax',
          background:
            'radial-gradient(ellipse at center, rgba(79,70,229,0.22) 0%, rgba(79,70,229,0.08) 50%, transparent 70%)',
        }}
      />
      {/* Orb 2 — violet, bottom-right quadrant */}
      <div
        className="orb"
        style={{
          width: '48vmax',
          height: '48vmax',
          bottom: '-16vmax',
          right: '-12vmax',
          background:
            'radial-gradient(ellipse at center, rgba(139,92,246,0.18) 0%, rgba(109,40,217,0.07) 50%, transparent 70%)',
        }}
      />
      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '256px 256px',
        }}
      />
    </div>
  )
}
