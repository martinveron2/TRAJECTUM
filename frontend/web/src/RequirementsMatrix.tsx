import { PROJECT_REQUIREMENTS, VERIFICATION_METHOD_LABELS } from './projectRequirements';

type Status = 'verified' | 'progress' | 'open';

type RequirementContext = {
  totalLengthMm: number;
  launchAngleDeg: number;
  payloadMassG: number;
  analysis?: {
    apogee_m?: number;
    impact_speed_m_s?: number;
    max_q_pa?: number;
    mission_timeline?: Array<{ t_s: number; altitude_m: number; q_pa: number }>;
  } | null;
};

function deriveStatus(id: string, ctx: RequirementContext): Status {
  if (id === 'R1') {
    if (ctx.analysis?.apogee_m != null && ctx.launchAngleDeg === 85) return ctx.analysis.apogee_m >= 150 ? 'verified' : 'progress';
    return 'progress';
  }
  if (id === 'R2') {
    if (ctx.analysis?.impact_speed_m_s != null) return ctx.analysis.impact_speed_m_s <= 5 ? 'verified' : 'progress';
    return 'progress';
  }
  if (id === 'R5') return ctx.totalLengthMm >= 800 ? 'verified' : 'progress';
  if (id === 'R7') return ctx.payloadMassG === 100 ? 'progress' : 'open';
  if (id === 'R8') return ctx.analysis?.max_q_pa != null ? 'verified' : 'progress';
  if (id === 'R9') return 'verified';
  return 'open';
}

export function RequirementsMatrix({
  lang = 'es',
  totalLengthMm,
  launchAngleDeg,
  payloadMassG,
  analysis,
}: {
  lang?: 'es' | 'en';
  totalLengthMm: number;
  launchAngleDeg: number;
  payloadMassG: number;
  analysis?: RequirementContext['analysis'];
}) {
  const isEs = lang === 'es';
  const ctx = { totalLengthMm, launchAngleDeg, payloadMassG, analysis };

  const maxQSample = analysis?.mission_timeline?.reduce<{ t_s: number; altitude_m: number; q_pa: number } | null>(
    (best, sample) => !best || sample.q_pa > best.q_pa ? sample : best,
    null,
  );

  const statusLabel = (status: Status) => status === 'verified'
    ? (isEs ? 'VERIFICADO ✓' : 'VERIFIED ✓')
    : status === 'progress'
      ? (isEs ? 'EN PROCESO ⏳' : 'IN PROGRESS ⏳')
      : (isEs ? 'ABIERTO ⭕' : 'OPEN ⭕');

  return (
    <div className="requirements-matrix">
      <div className="requirements-matrix-head">
        <div>
          <span>{isEs ? 'MATRIZ OFICIAL · TP INTEGRADOR UTN-FRH 2026' : 'OFFICIAL MATRIX · UTN-FRH INTEGRATOR 2026'}</span>
          <strong>{isEs ? 'REQUERIMIENTOS Y CUMPLIMIENTO' : 'REQUIREMENTS & COMPLIANCE'}</strong>
        </div>
        <b>R1–R11</b>
      </div>
      <div className="requirements-grid">
        {PROJECT_REQUIREMENTS.map((req) => {
          const status = deriveStatus(req.id, ctx);
          const extra = req.id === 'R8' && maxQSample
            ? `MaxQ ${maxQSample.q_pa.toFixed(0)} Pa · t ${maxQSample.t_s.toFixed(2)} s · h ${maxQSample.altitude_m.toFixed(1)} m`
            : req.id === 'R1' && analysis?.apogee_m != null
              ? `${analysis.apogee_m.toFixed(1)} m @ ${launchAngleDeg.toFixed(0)}°`
              : req.id === 'R2' && analysis?.impact_speed_m_s != null
                ? `${analysis.impact_speed_m_s.toFixed(2)} m/s`
                : null;
          return (
            <article className={`requirement-card ${status}`} key={req.id}>
              <div className="requirement-card-top">
                <span className="requirement-id">{req.id}</span>
                <span className={`requirement-status ${status}`}>{statusLabel(status)}</span>
              </div>
              <strong>{isEs ? req.titleEs : req.titleEn}</strong>
              <small>{isEs ? req.targetEs : req.targetEn}</small>
              {extra && <em>{extra}</em>}
              <div className="requirement-methods">
                {req.methods.map((method) => (
                  <span key={method} title={isEs ? VERIFICATION_METHOD_LABELS[method].es : VERIFICATION_METHOD_LABELS[method].en}>
                    {method}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
