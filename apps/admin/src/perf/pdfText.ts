// 성능 결과 문서의 글자 · 그림 — 성능 PDF(pdf.ts)와 QA 리포트 성능 구획이 같이 쓴다. 브라우저 · 대기열을 안 불러 순수 함수만 둔다 (도메인/성능 §3.9 「PDF」 · 리포팅 §3.17)

import { addHist, emptyHist, percentile } from './hist.js';
import type { SecRow } from './judge.js';
import type { Target } from './types.js';

export const 실행번호글 = (id: number) => `PRF-${String(id).padStart(4, '0')}`;

export const 유형글: Record<string, string> = { LOAD: '부하 테스트', STRESS: '스트레스 테스트', SPIKE: '스파이크 테스트', SOAK: '내구성 테스트' };
export const 지표글: Record<Target['metric'], string> = { P95: '95% 응답시간', ERROR_RATE: '에러율', TPS: 'TPS' };
export const 근거글: Record<Target['source'], string> = { PRD: '기획서', AI: 'AI 추천', MANUAL: '직접 입력' };
export const 판정글 = (v: 'PASS' | 'FAIL' | null, status: string) => (v === 'PASS' ? '통과' : v === 'FAIL' ? '실패' : status === 'ERROR' ? '오류' : '중단');

export function 값글(metric: Target['metric'], v: number | null): string {
  if (v === null) return '—';
  if (metric === 'P95') return `${(v / 1000).toFixed(1)}초`;
  if (metric === 'ERROR_RATE') return `${v.toFixed(2)}%`;
  return `${v.toFixed(1)}`;
}

// 1초 숫자를 10초 칸으로 묶은 꺾은선 둘(가상 사용자 · 95% 응답시간). 바깥 자원 없이 SVG 로 그린다
export function 추이(rows: SecRow[]): string {
  const total = rows.filter((r) => r.tx === '');
  if (total.length === 0) return '<p>숫자가 없습니다</p>';
  const 칸 = new Map<number, { vus: number; hist: number[] }>();
  for (const r of total) {
    const k = Math.floor(r.sec / 10);
    const c = 칸.get(k) ?? { vus: 0, hist: emptyHist() };
    c.vus = Math.max(c.vus, r.vus);
    addHist(c.hist, r.hist);
    칸.set(k, c);
  }
  const 점들 = [...칸.entries()].sort((a, b) => a[0] - b[0]).map(([k, c]) => ({ x: k, vus: c.vus, p95: percentile(c.hist, 0.95) ?? 0 }));
  const W = 640;
  const H = 160;
  const maxX = Math.max(1, 점들[점들.length - 1]?.x ?? 1);
  const 선 = (값: (p: (typeof 점들)[number]) => number) => {
    const top = Math.max(1, ...점들.map(값));
    return 점들.map((p) => `${((p.x / maxX) * W).toFixed(1)},${(H - (값(p) / top) * H).toFixed(1)}`).join(' ');
  };
  return [
    `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="가상 사용자와 95% 응답시간 추이">`,
    `<polyline fill="none" stroke="#2563eb" stroke-width="2" points="${선((p) => p.vus)}"/>`,
    `<polyline fill="none" stroke="#dc2626" stroke-width="2" points="${선((p) => p.p95)}"/>`,
    `</svg>`,
    `<p>파란 선 가상 사용자 · 빨간 선 95% 응답시간 (10초 단위)</p>`,
  ].join('\n');
}
