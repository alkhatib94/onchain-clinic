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

export default function ProgressRadar({ areas }: { areas: RadarAreas }) {
  // ترتيب المحاور (ست نقاط)
  const keys: (keyof RadarAreas)[] = ["history","activity","variety","costs","clinics","lifestyle"];
  const vals = keys.map(k => clamp(areas[k]));
  const pts = polygonPoints(vals);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
      <div className="p-5 border-b border-white/10 text-lg font-semibold">Progress Radar</div>
      <div className="p-6">
        <svg viewBox="-120 -120 240 240" width="100%" className="max-h-[260px] mx-auto block">
          {/* rings */}
          { [20,40,60,80,100].map((r,i)=>(
            <polygon
              key={i}
              points={polygonPoints(Array(6).fill(r))}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
            />
          ))}
          {/* axes */}
          {axisLines().map((p,i)=>(
            <line key={i} x1="0" y1="0" x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.12)" />
          ))}
          {/* shape */}
          <polygon
            points={pts}
            fill="url(#radarGrad)"
            stroke="rgba(99,102,241,0.9)"
            strokeWidth="1.5"
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
            const R = 112;
            const x = Math.cos(a)*R;
            const y = Math.sin(a)*R;
            return (
              <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="rgba(255,255,255,0.8)">
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
function axisLines(){
  const pts = [];
  for(let i=0;i<6;i++){
    const a = (i/6)*2*Math.PI - Math.PI/2;
    pts.push({ x: Math.cos(a)*100, y: Math.sin(a)*100 });
  }
  return pts;
}
function polygonPoints(vals:number[]){
  const pts = vals.map((v,i)=>{
    const r = (v/100)*100;
    const a = (i/6)*2*Math.PI - Math.PI/2;
    return `${Math.cos(a)*r},${Math.sin(a)*r}`;
  });
  return pts.join(" ");
}
