// app/components/ProgressRadar.tsx
"use client";

export type RadarAreas = {
  history: number;
  activity: number;
  variety: number;
  costs: number;
  clinics: number;
  lifestyle: number;
};

type Props = {
  areas: RadarAreas;
  /** القطر بالبكسل داخل الـ viewBox (افتراضي 260) */
  size?: number;
  /** يقلّل نصوص العناوين ويقصر نصف القطر */
  compact?: boolean;
  /** أقصى عرض للـ SVG (Tailwind) */
  maxWidthClass?: string; // مثلا "max-w-sm"
};

export default function ProgressRadar({
  areas,
  size = 260,
  compact = true,
  maxWidthClass = "max-w-md",
}: Props) {
  // إعدادات الحجم
  const half = size / 2;                 // نصف القطر في viewBox
  const baseR = compact ? half - 22 : half - 12;  // تقليل قليل للعناوين
  const labelR = baseR + (compact ? 6 : 12);
  const labelFont = compact ? 10 : 12;
  const ringStroke = compact ? 0.8 : 1.1;

  // ترتيب المحاور
  const keys: (keyof RadarAreas)[] = ["history","activity","variety","costs","clinics","lifestyle"];
  const vals = keys.map(k => clamp(areas[k]));
  const pts = polygonPoints(vals, baseR);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
      <div className="p-4 border-b border-white/10 text-sm font-semibold">Progress Radar</div>
      <div className={`p-4 ${maxWidthClass} mx-auto`}>
        <svg
          viewBox={`${-half} ${-half} ${size} ${size}`}
          width="100%"
          height="auto"
          preserveAspectRatio="xMidYMid meet"
          className="block"
        >
          {/* rings */}
          {[0.2,0.4,0.6,0.8,1].map((f,i)=>(
            <polygon
              key={i}
              points={polygonPoints(Array(6).fill(f*100), baseR)}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={ringStroke}
            />
          ))}

          {/* axes */}
          {axisLines(baseR).map((p,i)=>(
            <line key={i} x1="0" y1="0" x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.12)" strokeWidth={ringStroke}/>
          ))}

          {/* shape */}
          <polygon
            points={pts}
            fill="url(#radarGrad)"
            stroke="rgba(99,102,241,0.9)"
            strokeWidth={1.2}
          />
          <defs>
            <radialGradient id="radarGrad">
              <stop offset="0%" stopColor="rgba(16,185,129,0.35)" />
              <stop offset="60%" stopColor="rgba(56,189,248,0.25)" />
              <stop offset="100%" stopColor="rgba(168,85,247,0.20)" />
            </radialGradient>
          </defs>

          {/* labels */}
          {keys.map((k,i)=>{
            const a = (i/6)*2*Math.PI - Math.PI/2;
            const x = Math.cos(a)*labelR;
            const y = Math.sin(a)*labelR;
            return (
              <text
                key={k}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={labelFont}
                fill="rgba(255,255,255,0.85)"
              >
                {title(k)}
              </text>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

function clamp(n:number){ return Math.max(0, Math.min(100, n)); }
function title(s:string){ return s.replace(/^\w/, m=>m.toUpperCase()); }

function axisLines(r:number){
  const pts = [];
  for(let i=0;i<6;i++){
    const a = (i/6)*2*Math.PI - Math.PI/2;
    pts.push({ x: Math.cos(a)*r, y: Math.sin(a)*r });
  }
  return pts;
}

function polygonPoints(vals:number[], r:number){
  const pts = vals.map((v,i)=>{
    const radius = (v/100)*r;
    const a = (i/6)*2*Math.PI - Math.PI/2;
    return `${Math.cos(a)*radius},${Math.sin(a)*radius}`;
  });
  return pts.join(" ");
}
