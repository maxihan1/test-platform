// 호환성 결과의 순수 셈 — 칸(화면 × 점검 상태) · 머리 숫자 · 카드 · 미점검 까닭 (도메인/호환성 §3.13 「결과 · 판정」)

import type { 의심 } from './uiCheck.js';

export type 상태값 = 'WAIT' | 'RUNNING' | 'CHECKING' | 'DONE' | 'SKIPPED' | 'STOPPED';
export type 칸값 = 'OK' | 'PENDING' | 'CONFIRMED' | 'NOT_DEFECT' | 'UNCHECKED';

export interface 상태줄 {
  seq: number;
  serial: string;
  heldSerial: string | null;
  model: string;
  name: string;
  os: string | null;
  fold: 'OPEN' | 'FOLDED' | null;
  state: 상태값;
  skipReason: string | null;
}

export interface 케이스줄 {
  id: number;
  seq: number;
  tcId: string;
  status: 'PASS' | 'FAIL' | 'NA';
  failedStep: number | null;
  checkState: 'checking' | 'done' | 'failed' | 'limit' | 'missing' | null;
  started: boolean;
  finished: boolean;
  /** 케이스가 남긴 오류 문장 — 못 돌린 까닭(Chrome 을 못 켬 · 케이스가 없어짐 · 서버가 다시 켜짐)을 미점검 칸에 보인다 */
  까닭: string | null;
}

export interface 저장화면 {
  id: number;
  caseRunId: number;
  seq: number;
  key: string;
  step: number | null;
  status: 'done' | 'failed' | 'skipped';
  issues: 의심[];
}

export interface 판정줄 {
  key: string;
  seq: number;
  verdict: 'CONFIRMED' | 'NOT_DEFECT';
  judgedBy: string;
  judgedAt: string;
}

export interface 결과재료 {
  상태들: 상태줄[];
  케이스들: 케이스줄[];
  화면들: 저장화면[];
  판정들: 판정줄[];
  /** 케이스가 지나는 화면 열쇠(장소 빼고) */
  지나는: ReadonlyMap<string, readonly string[]>;
  /** 케이스가 아는 화면 수 — 점검 중인 케이스의 남은 장 수를 어림한다 */
  화면수: ReadonlyMap<string, number>;
  이름: ReadonlyMap<string, string>;
}

const 점검까닭: Record<string, string> = {
  limit: 'AI 사용 한도 초과로 점검 중단',
  failed: 'AI 점검이 실패했습니다',
  missing: 'AI 점검 결과를 받지 못했습니다',
};

export const 화면이름 = (key: string, 이름: ReadonlyMap<string, string>): string => {
  const 모름 = /^unknown:(.+)#(\d+)$/.exec(key);
  if (모름 !== null) return `화면 모름 — ${모름[1]} ${모름[2]}단계`;
  return 이름.get(key) ?? key;
};

/** 칸 하나의 값. 아직 정할 수 없으면(돌거나 점검 중) null */
function 칸(재: 결과재료, 상태: 상태줄, key: string, 화면: 저장화면[], 판정: 판정줄 | undefined): { value: 칸값; reason?: string } | null {
  if (화면.some((s) => s.issues.length > 0)) return { value: 판정?.verdict ?? 'PENDING' };
  if (화면.some((s) => s.status === 'done')) return { value: 'OK' };
  if (상태.state === 'SKIPPED') return { value: 'UNCHECKED', reason: 상태.skipReason ?? '디바이스를 잡지 못했습니다' };
  if (상태.state === 'WAIT' || 상태.state === 'RUNNING') return null;
  const 지난케이스 = 재.케이스들.filter((c) => c.seq === 상태.seq && (재.지나는.get(c.tcId)?.includes(key) === true || 화면.some((s) => s.caseRunId === c.id)));
  if (지난케이스.some((c) => c.checkState === 'checking' || (c.started && !c.finished))) return null;
  const 실패 = 지난케이스.find((c) => c.status === 'FAIL');
  if (실패 !== undefined) return { value: 'UNCHECKED', reason: `${실패.tcId} 이 ${실패.failedStep === null ? '' : `${실패.failedStep}단계에서 `}실패` };
  const 못돈 = 지난케이스.find((c) => !c.started || (c.status === 'NA' && c.checkState === null));
  if (못돈 !== undefined) return { value: 'UNCHECKED', reason: (못돈.started ? 못돈.까닭 : null) ?? 상태.skipReason ?? 못돈.까닭 ?? '케이스를 돌리지 못했습니다' };
  // 여러 케이스가 지나면 limit → failed → missing 차례로 앞엣것 하나다
  const 점검 = (['limit', 'failed', 'missing'] as const).find((v) => 지난케이스.some((c) => c.checkState === v));
  if (점검 !== undefined) return { value: 'UNCHECKED', reason: 점검까닭[점검]! };
  return { value: 'UNCHECKED', reason: '찍힌 화면이 없습니다' };
}

export function 결과셈(재: 결과재료) {
  const 판정 = new Map(재.판정들.map((v) => [`${v.key}#${v.seq}`, v]));
  // 그 상태가 지나야 했던 화면 = 돈 케이스들의 화면 + 실제로 찍힌 화면
  const 열쇠들 = new Set<string>();
  const 상태열쇠 = new Map<number, Set<string>>(재.상태들.map((d) => [d.seq, new Set<string>()]));
  for (const c of 재.케이스들) for (const k of 재.지나는.get(c.tcId) ?? []) 상태열쇠.get(c.seq)?.add(k);
  for (const s of 재.화면들) 상태열쇠.get(s.seq)?.add(s.key);
  for (const ks of 상태열쇠.values()) for (const k of ks) 열쇠들.add(k);

  const 줄들 = [...열쇠들].sort().map((key) => ({
    key,
    name: 화면이름(key, 재.이름),
    cells: 재.상태들.flatMap((d) => {
      if (!상태열쇠.get(d.seq)?.has(key)) return [];
      const 값 = 칸(재, d, key, 재.화면들.filter((s) => s.seq === d.seq && s.key === key), 판정.get(`${key}#${d.seq}`));
      return 값 === null ? [] : [{ seq: d.seq, ...값 }];
    }),
  }));
  const 셀들 = 줄들.flatMap((r) => r.cells);
  const 수 = (v: 칸값) => 셀들.filter((c) => c.value === v).length;
  const 의심상태 = new Set(셀들.filter((c) => c.value === 'PENDING' || c.value === 'CONFIRMED').map((c) => c.seq));

  return {
    devices: 재.상태들.map((d) => {
      const 케이스 = 재.케이스들.filter((c) => c.seq === d.seq);
      const 찍힘 = 재.화면들.filter((s) => s.seq === d.seq).length;
      const 남은 = 케이스.filter((c) => c.checkState === 'checking').reduce((a, c) => a + Math.max(1, 재.화면수.get(c.tcId) ?? 0), 0);
      return {
        seq: d.seq,
        serial: d.heldSerial ?? d.serial,
        model: d.model,
        name: d.name,
        os: d.os,
        fold: d.fold,
        state: d.state,
        cases: { done: 케이스.filter((c) => c.finished).length, total: 케이스.length },
        checks: { done: 찍힘, total: 찍힘 + 남은 },
        skipReason: d.skipReason,
      };
    }),
    counts: {
      screens: 줄들.filter((r) => r.cells.some((c) => c.value !== 'UNCHECKED')).length,
      devices: new Set(재.상태들.map((d) => d.heldSerial ?? d.serial)).size,
      states: 재.상태들.length,
      confirmed: 수('CONFIRMED'),
      pending: 수('PENDING'),
      notDefect: 수('NOT_DEFECT'),
      unchecked: 줄들.filter((r) => r.cells.some((c) => c.value === 'UNCHECKED')).length,
    },
    rows: 줄들.filter((r) => r.cells.some((c) => c.value !== 'OK')),
    hiddenOk: 줄들.filter((r) => r.cells.length > 0 && r.cells.every((c) => c.value === 'OK')).length,
    cards: 재.화면들
      .filter((s) => s.issues.length > 0)
      .map((s) => {
        const v = 판정.get(`${s.key}#${s.seq}`);
        return {
          key: s.key,
          seq: s.seq,
          screenId: s.id,
          tcId: 재.케이스들.find((c) => c.id === s.caseRunId)?.tcId ?? '',
          step: s.step,
          issues: s.issues,
          verdict: v?.verdict ?? null,
          judgedBy: v?.judgedBy ?? null,
          judgedAt: v?.judgedAt ?? null,
        };
      }),
    affected: { states: 의심상태.size, total: 재.상태들.length },
  };
}
