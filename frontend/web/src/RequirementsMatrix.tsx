import { useMemo, useRef, useState } from 'react';
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
  const touchStartX = useRef(0);
  const [storyDragX, setStoryDragX] = useState(0);
  const [storyDragging, setStoryDragging] = useState(false);

  const effectiveStatuses = useMemo(
    () => Object.fromEntries(PROJECT_REQUIREMENTS.map((req) => [req.id, statusOverrides[req.id] ?? deriveRequirementStatus(req.id, ctx)])) as RequirementStatusOverrides,
    [ctx, statusOverrides],
  );

  const selectedIndex = Math.max(0, PROJECT_REQUIREMENTS.findIndex((req) => req.id === selectedRequirementId));
  const selectedReq = PROJECT_REQUIREMENTS[selectedIndex];
  const verifiedCount = PROJECT_REQUIREMENTS.filter((req) => effectiveStatuses[req.id] === 'verified').length;
  const completionPct = Math.round((verifiedCount / PROJECT_REQUIREMENTS.length) * 100);

  const moveRequirement = (delta: number) => {
    const next = Math.max(0, Math.min(PROJECT_REQUIREMENTS.length - 1, selectedIndex + delta));
    onSelectRequirement(PROJECT_REQUIREMENTS[next].id);
  };

  const maxQSample = analysis?.mission_timeline?.reduce<{ t_s: number; altitude_m: number; q_pa: number } | null>(
    (best, sample) => !best || sample.q_pa > best.q_pa ? sample : best,
    null,
  );

  const statusLabel = (status: RequirementStatus) => status === 'verified'
    ? (isEs ? 'VERIFICADO ✓' : 'VERIFIED ✓')
    : status === 'progress'
      ? (isEs ? 'EN PROCESO ⏳' : 'IN PROGRESS ⏳')
      : (isEs ? 'ABIERTO ⭕' : 'OPEN ⭕');

  const requirementExtra = (id: string) => id === 'R8' && maxQSample
    ? `qmax ${maxQSample.q_pa.toFixed(0)} Pa · t ${maxQSample.t_s.toFixed(2)} s · h ${maxQSample.altitude_m.toFixed(1)} m`
    : id === 'R1' && analysis?.apogee_m != null
      ? `${analysis.apogee_m.toFixed(1)} m @ ${launchAngleDeg.toFixed(0)}°`
      : id === 'R2' && analysis?.impact_speed_m_s != null
        ? `${analysis.impact_speed_m_s.toFixed(2)} m/s`
        : null;

  return (
    <div className="requirements-matrix">
      <div
        className="requirements-story-card"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? 0;
          setStoryDragging(true);
          setStoryDragX(0);
        }}
        onTouchMove={(event) => {
          const x = event.touches[0]?.clientX ?? touchStartX.current;
          setStoryDragX(Math.max(-72, Math.min(72, x - touchStartX.current)));
        }}
        onTouchEnd={(event) => {
          const end = event.changedTouches[0]?.clientX ?? touchStartX.current;
          const delta = end - touchStartX.current;
          if (Math.abs(delta) > 34) moveRequirement(delta < 0 ? 1 : -1);
          setStoryDragging(false);
          setStoryDragX(0);
        }}
        onTouchCancel={() => {
          setStoryDragging(false);
          setStoryDragX(0);
        }}
      >
        <div className="requirements-story-progress" aria-hidden="true">
          {PROJECT_REQUIREMENTS.map((req, index) => (
            <i key={req.id} className={index === selectedIndex ? 'active' : index < selectedIndex ? 'past' : ''} />
          ))}
        </div>

        <div className="requirements-story-viewport">
          <div
            className={storyDragging ? 'requirements-story-track dragging' : 'requirements-story-track'}
            style={{ transform: `translate3d(calc(-${selectedIndex * (100 / 11)}% + ${storyDragX}px),0,0)` }}
          >
            {PROJECT_REQUIREMENTS.map((req, index) => (
              <div className="requirements-story-slide" key={req.id} aria-hidden={index !== selectedIndex}>
                <div className="requirements-story-copy">
                  <span>{isEs ? 'REQUERIMIENTOS Y CUMPLIMIENTO' : 'REQUIREMENTS & COMPLIANCE'}</span>
                  <strong>{req.id} · {isEs ? req.titleEs : req.titleEn}</strong>
                  <small>{isEs ? req.targetEs : req.targetEn}</small>
                </div>
                <div className="requirements-story-counter">
                  <b>{String(index + 1).padStart(2, '0')}/11</b>
                  <small>{isEs ? 'REQUERIMIENTO' : 'REQUIREMENT'}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="requirements-story-footer">
          <span>{isEs ? 'DESLIZÁ PARA CAMBIAR DE REQUERIMIENTO' : 'SWIPE TO CHANGE REQUIREMENT'}</span>
          <b>{verifiedCount}/11 · {completionPct}%</b>
        </div>
      </div>

      <div className="requirements-grid" aria-label={isEs ? 'Matriz completa de requerimientos' : 'Full requirements matrix'}>
        {PROJECT_REQUIREMENTS.map((req) => {
          const status = effectiveStatuses[req.id];
          const extra = requirementExtra(req.id);
          return (
            <article
              className={`requirement-card ${status} ${selectedRequirementId === req.id ? 'selected' : ''}`}
              key={req.id}
              onClick={() => {
                onSelectRequirement(req.id);
                onStatusChange(req.id, nextStatus(status));
              }}
              role="button"
              tabIndex={0}
              aria-label={isEs ? `${req.id}: tocar para cambiar estado` : `${req.id}: tap to change status`}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectRequirement(req.id);
                  onStatusChange(req.id, nextStatus(status));
                }
              }}
            >
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

      <div className="requirements-tap-hint">{isEs ? 'TOCÁ CUALQUIER TARJETA PARA CAMBIAR SU ESTADO' : 'TAP ANY CARD TO CHANGE ITS STATUS'}</div>
    </div>
  );
}
