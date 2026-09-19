import { useEffect, useMemo, useRef } from 'react';
import { PROJECT_REQUIREMENTS, VERIFICATION_METHOD_LABELS } from './projectRequirements';

export type RequirementStatus = 'verified' | 'progress' | 'open';
export type RequirementStatusOverrides = Record<string, RequirementStatus>;

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

export function deriveRequirementStatus(id: string, ctx: RequirementContext): RequirementStatus {
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

const STATUS_ORDER: RequirementStatus[] = ['open', 'progress', 'verified'];

function nextStatus(status: RequirementStatus): RequirementStatus {
  return STATUS_ORDER[(STATUS_ORDER.indexOf(status) + 1) % STATUS_ORDER.length];
}

export function RequirementsMatrix({
  lang = 'es',
  totalLengthMm,
  launchAngleDeg,
  payloadMassG,
  analysis,
  statusOverrides,
  onStatusChange,
  selectedRequirementId,
  onSelectRequirement,
}: {
  lang?: 'es' | 'en';
  totalLengthMm: number;
  launchAngleDeg: number;
  payloadMassG: number;
  analysis?: RequirementContext['analysis'];
  statusOverrides: RequirementStatusOverrides;
  onStatusChange: (id: string, status: RequirementStatus) => void;
  selectedRequirementId: string;
  onSelectRequirement: (id: string) => void;
}) {
  const isEs = lang === 'es';
  const ctx = useMemo(() => ({ totalLengthMm, launchAngleDeg, payloadMassG, analysis }), [totalLengthMm, launchAngleDeg, payloadMassG, analysis]);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const effectiveStatuses = useMemo(
    () => Object.fromEntries(PROJECT_REQUIREMENTS.map((req) => [req.id, statusOverrides[req.id] ?? deriveRequirementStatus(req.id, ctx)])) as RequirementStatusOverrides,
    [ctx, statusOverrides],
  );

  const verifiedCount = PROJECT_REQUIREMENTS.filter((req) => effectiveStatuses[req.id] === 'verified').length;
  const completionPct = Math.round((verifiedCount / PROJECT_REQUIREMENTS.length) * 100);

  useEffect(() => {
    const selected = trackRef.current?.querySelector<HTMLElement>(`[data-requirement-id="${selectedRequirementId}"]`);
    selected?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedRequirementId]);

  const maxQSample = analysis?.mission_timeline?.reduce<{ t_s: number; altitude_m: number; q_pa: number } | null>(
    (best, sample) => !best || sample.q_pa > best.q_pa ? sample : best,
    null,
  );

  const statusLabel = (status: RequirementStatus) => status === 'verified'
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
        <div className="requirements-progress" aria-label={isEs ? 'Avance de cumplimiento' : 'Compliance progress'}>
          <b>{verifiedCount}/11</b>
          <small>{completionPct}%</small>
        </div>
      </div>

      <div className="requirements-carousel" ref={trackRef} aria-label={isEs ? 'Carrusel de requerimientos' : 'Requirements carousel'}>
        {PROJECT_REQUIREMENTS.map((req) => {
          const status = effectiveStatuses[req.id];
          const extra = req.id === 'R8' && maxQSample
            ? `MaxQ ${maxQSample.q_pa.toFixed(0)} Pa · t ${maxQSample.t_s.toFixed(2)} s · h ${maxQSample.altitude_m.toFixed(1)} m`
            : req.id === 'R1' && analysis?.apogee_m != null
              ? `${analysis.apogee_m.toFixed(1)} m @ ${launchAngleDeg.toFixed(0)}°`
              : req.id === 'R2' && analysis?.impact_speed_m_s != null
                ? `${analysis.impact_speed_m_s.toFixed(2)} m/s`
                : null;

          return (
            <article
              className={`requirement-card ${status} ${selectedRequirementId === req.id ? 'selected' : ''}`}
              key={req.id}
              data-requirement-id={req.id}
              onClick={() => onSelectRequirement(req.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectRequirement(req.id);
                }
              }}
            >
              <div className="requirement-card-top">
                <span className="requirement-id">{req.id}</span>
                <button
                  type="button"
                  className={`requirement-status-toggle ${status}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onStatusChange(req.id, nextStatus(status));
                  }}
                  aria-label={isEs ? `Cambiar estado de ${req.id}` : `Change ${req.id} status`}
                >
                  {statusLabel(status)}
                </button>
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

      <div className="requirements-swipe-hint">{isEs ? 'DESLIZÁ ENTRE R1–R11 · TOCÁ UNA TARJETA PARA SELECCIONARLA' : 'SWIPE R1–R11 · TAP A CARD TO SELECT'}</div>
    </div>
  );
}
