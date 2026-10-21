// 성능 실행 화면의 꺾은선 그래프 — 손으로 그린 SVG (새 패키지를 넣지 않는다). 선마다 제 최댓값에 맞춰 그린다
// 쓰는 곳은 실행 중 「응답시간과 가상 사용자 추이」 · 결과 「시간대별 추이」 (도메인/성능 §8.14)

import { use말 } from './i18n.js';
import { 선점 } from './perfRunView.js';

export interface 선 {
  이름: string;
  /** CSS 색 — 토큰 `var(--…)` 를 쓴다 */
  색: string;
  점들: { x: number; y: number }[];
  최대Y: number;
  굵게?: boolean;
}

const 너비 = 600;

export function PerfChart({
  선들,
  최대X,
  높이 = 220,
  목표,
  왼쪽눈금,
  세로선,
  라벨,
}: {
  선들: 선[];
  /** 가로축 끝(초) */
  최대X: number;
  높이?: number;
  /** 가로 점선 — 값은 `최대Y` 와 같은 단위다 */
  목표?: { 이름: string; 값: number; 최대Y: number };
  /** 왼쪽에 붙일 눈금 글자 — 위에서 아래 순서 */
  왼쪽눈금?: string[];
  /** 자동 중단 같은 세로선(초) */
  세로선?: { x: number; 색: string };
  라벨: string;
}) {
  const t = use말();
  const 분 = Math.max(1, Math.ceil(최대X / 60));
  const 목표y = 목표 === undefined ? null : Math.round(높이 - 2 - (Math.min(목표.값, 목표.최대Y) / Math.max(1e-9, 목표.최대Y)) * (높이 - 4));
  return (
    <div className="perf-chart">
      <div className="perf-legend perf-faint">
        {선들.map((s) => (
          <span key={s.이름}>
            <i style={{ background: s.색 }} />
            {s.이름}
          </span>
        ))}
        {목표 === undefined ? null : (
          <span>
            <i style={{ background: 'var(--fail)' }} />
            {목표.이름}
          </span>
        )}
      </div>
      <div className="perf-chart-body">
        {왼쪽눈금 === undefined ? null : (
          <div className="perf-ticks perf-faint" aria-hidden="true">
            {왼쪽눈금.map((글) => (
              <span key={글}>{글}</span>
            ))}
          </div>
        )}
        <div className="perf-chart-plot">
          <svg viewBox={`0 0 ${String(너비)} ${String(높이)}`} preserveAspectRatio="none" className="perf-graph" style={{ height: 높이 }} role="img" aria-label={라벨}>
            {목표y === null ? null : <line x1="0" y1={목표y} x2={너비} y2={목표y} className="perf-goal" vectorEffect="non-scaling-stroke" />}
            {선들.map((s) => (
              <polyline key={s.이름} points={선점(s.점들, 최대X, s.최대Y, 너비, 높이)} style={{ stroke: s.색, strokeWidth: s.굵게 === true ? 2.5 : 2 }} vectorEffect="non-scaling-stroke" />
            ))}
            {세로선 === undefined ? null : (
              <line x1={Math.round((세로선.x / Math.max(1, 최대X)) * 너비)} y1="0" x2={Math.round((세로선.x / Math.max(1, 최대X)) * 너비)} y2={높이} style={{ stroke: 세로선.색 }} vectorEffect="non-scaling-stroke" />
            )}
          </svg>
          <div className="perf-axis perf-faint">
            <span>{t('{수}분', { 수: 0 })}</span>
            <span>{t('{수}분', { 수: Math.round(분 / 2) })}</span>
            <span>{t('{수}분', { 수: 분 })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
