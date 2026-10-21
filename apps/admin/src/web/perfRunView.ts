// 성능 실행 화면의 계산 — 판정 글자 · 숫자 꼴 · 최근 숫자 집계 · 그래프 점 (도메인/성능 §3.9 「실행 · 결과」)

import type { 판정하기 } from './runJudge.js';
import type { Target, 실행상태, 실행판정, 중단사유, 초숫자 } from './perfApi.js';

/** 글자를 영어 표로 옮기는 함수. 훅을 못 쓰는 이 파일은 화면에서 받는다 */
export type 말 = (키: string, 값?: Record<string, string | number>) => string;

/** 실행 중 · AI 분석을 기다리는 동안 다시 읽는 간격(ms). 검사가 기다리지 않게 바꿀 수 있게 내보낸다 (§8.14 「5초마다」) */
export const 갱신간격 = { ms: 5000 };

/** AI 일이 서기 전 틈에 실행을 다시 읽는 간격(ms). 일이 서면 가벼운 일 상태만 묻는다 */
export const 틈간격 = { ms: 10_000 };
/** 끝쓰기와 AI 일 세우기 사이에 이 시간 안이면 분석이 곧 선다고 본다(ms) */
export const 분석틈 = 120_000;

/** 그 실행의 애플리케이션 접두사로 실행 칸 권한을 본다 — 띠에서 고른 애플리케이션이 아니다 */
export const 실행쓰나 = (판정: 판정하기, run: { servicePrefix: string }): boolean => 판정(run.servicePrefix)('실행');

const 진행 = new Set<실행상태>(['QUEUED', 'SMOKE', 'RUNNING']);
/** 페이지 · 기기 측정은 결과를 제 화면이 보인다 — 실행 한 건 주소 대신 그 화면으로 간다 (§8.14) */
export const 측정자리 = (kind: string | undefined): '#/perf/pages' | '#/perf/devices' | null =>
  kind === 'PAGE' ? '#/perf/pages' : kind === 'DEVICE' ? '#/perf/devices' : null;

export const 도는중인가 = (상태: 실행상태): boolean => 진행.has(상태);

export type 판정종류 = 'PASS' | 'FAIL' | 'STOP' | 'ERROR' | 'LIVE';
type 끝판정 = Exclude<판정종류, 'LIVE'>;

/** 판정이 있으면 판정이 먼저다. 판정 없는 중단 · 오류는 판정이 아니라 그냥 「중단」 「오류」다 (§3.9 끝난 모양 표) */
export function 판정종류(실행: { status: 실행상태; verdict: 실행판정 }): 판정종류 {
  if (실행.verdict === 'PASS' || 실행.verdict === 'FAIL') return 실행.verdict;
  if (실행.status === 'STOPPED') return 'STOP';
  if (실행.status === 'ERROR') return 'ERROR';
  return 'LIVE';
}

const 판정글자: Record<끝판정, string> = { PASS: '통과', FAIL: '실패', STOP: '중단', ERROR: '오류' };
export const 판정꼴: Record<끝판정, string> = { PASS: 'v-pass', FAIL: 'v-fail', STOP: 'v-na', ERROR: 'v-na' };
export function 판정이름(종류: 끝판정, t: 말): string {
  return t(판정글자[종류]);
}

/** 끝난 모양의 까닭 한 줄 (§3.9 끝난 모양 표) */
const 사유글자: Record<Exclude<중단사유, null>, string> = {
  TARGET_EXCEEDED: '성능 목표를 벗어나 자동 중단',
  ERROR_LIMIT: '에러율 20% 초과로 자동 중단',
  SMOKE_FAILED: '스모크 테스트 실패',
  AGENT_LOST: '부하 발생 에이전트 연결 끊김',
  USER: '사람이 중단',
};
export function 사유이름(사유: Exclude<중단사유, null>, t: 말): string {
  return t(사유글자[사유]);
}

/** 1342 → 「1,342」 */
export const 수 = (n: number): string => Math.round(n).toLocaleString('ko-KR');

/** 화면은 시간을 0.1초 단위 초로 보인다 (§3.9 「분포」) */
export const 초글자 = (ms: number | null, t: 말): string => (ms === null ? '-' : t('{수}초', { 수: Number((ms / 1000).toFixed(1)) }));
export const 퍼센트글자 = (p: number | null): string => (p === null ? '-' : `${Number(p.toFixed(1))}%`);
export const 명글자 = (n: number | null, t: 말): string => (n === null ? '-' : t('{수}명', { 수: 수(n) }));

/** 83 → 「01:23」 */
export function 분초(초: number): string {
  const 정수 = Math.max(0, Math.round(초));
  return `${String(Math.floor(정수 / 60)).padStart(2, '0')}:${String(정수 % 60).padStart(2, '0')}`;
}

/** 목표 한 줄의 글자 — 「≤ 2초」 「≥ 300」 「≤ 1%」 */
export function 목표글자(목표: Pick<Target, 'metric' | 'op' | 'value'>, t: 말): string {
  const 값 = 목표.metric === 'P95' ? 초글자(목표.value, t) : 목표.metric === 'ERROR_RATE' ? 퍼센트글자(목표.value) : String(목표.value);
  return `${목표.op === '<=' ? '≤' : '≥'} ${값}`;
}

export function 측정글자(목표: Pick<Target, 'metric'>, 값: number | null, t: 말): string {
  if (값 === null) return '-';
  return 목표.metric === 'P95' ? 초글자(값, t) : 목표.metric === 'ERROR_RATE' ? 퍼센트글자(값) : 수(값);
}

/** 변화 글자 — 이전 95% 대비 늘어난 비율. 이전이 없으면 null */
export function 증가율(지금: number | null, 이전: number | null): number | null {
  if (지금 === null || 이전 === null || 이전 <= 0) return null;
  return Math.round(((지금 - 이전) / 이전) * 100);
}

export interface 최근숫자 {
  vus: number;
  tps: number;
  p95Ms: number;
  errorRate: number;
}

/**
 * 맨 끝 몇 초의 숫자. TPS 는 초당 요청 평균, 에러율은 요청 합 대비 에러 합이다.
 * ponytail: 95% 응답시간은 분포를 합칠 수 없어 초별 값의 요청 가중 평균으로 어림한다 — 화면은 0.1초 단위라 충분하다
 */
export function 최근집계(줄들: readonly 초숫자[], 초수 = 5): 최근숫자 | null {
  const 뒤 = 줄들.slice(-초수);
  const 끝 = 뒤.at(-1);
  if (끝 === undefined) return null;
  const 요청 = 뒤.reduce((n, 줄) => n + 줄.requests, 0);
  const 에러 = 뒤.reduce((n, 줄) => n + 줄.errors, 0);
  const 무게 = 뒤.reduce((n, 줄) => n + 줄.p95Ms * 줄.requests, 0);
  return { vus: 끝.vus, tps: 요청 / 뒤.length, p95Ms: 요청 === 0 ? 0 : 무게 / 요청, errorRate: 요청 === 0 ? 0 : (에러 / 요청) * 100 };
}

/** 전체 줄(tx 가 빈 글자)만, 시간 순으로 */
export const 전체줄 = (줄들: readonly 초숫자[]): 초숫자[] => 줄들.filter((줄) => 줄.tx === '').sort((a, b) => a.sec - b.sec);

/** 트랜잭션 이름 → 그 이름의 줄들 (전체 줄은 뺀다) */
export function 트랜잭션줄(줄들: readonly 초숫자[]): Map<string, 초숫자[]> {
  const 모음 = new Map<string, 초숫자[]>();
  for (const 줄 of 줄들) {
    if (줄.tx === '') continue;
    const 앞 = 모음.get(줄.tx);
    if (앞 === undefined) 모음.set(줄.tx, [줄]);
    else 앞.push(줄);
  }
  return 모음;
}

/** 가장 큰 값 — 수십만 줄에 Math.max(...배열) 을 쓰면 인자가 너무 많아 RangeError 가 난다 */
export const 가장큰값 = (값들: readonly number[], 바닥 = 0): number => 값들.reduce((큰, 값) => (값 > 큰 ? 값 : 큰), 바닥);

/** 대상이 없으면 전체 */
export const 목표대상 = (목표: Pick<Target, 'scope'>): string | null => (목표.scope === undefined || 목표.scope === '' ? null : 목표.scope);

/** 그래프 좌표. 각 선은 제 최댓값에 맞춰 그린다 — 응답시간(초)과 가상 사용자(명)는 단위가 달라서 */
export function 선점(값들: readonly { x: number; y: number }[], 최대X: number, 최대Y: number, 너비: number, 높이: number): string {
  const 위 = Math.max(1e-9, 최대Y);
  return 값들.map((p) => `${Math.round((p.x / Math.max(1, 최대X)) * 너비)},${Math.round(높이 - 2 - (Math.min(p.y, 위) / 위) * (높이 - 4))}`).join(' ');
}

/** 세로 눈금 최댓값 — 가장 큰 값 위로 한 칸 여유를 둔다 */
export const 눈금최대 = (...값들: number[]): number => Math.max(1, Math.ceil(Math.max(...값들, 0) * 1.1));

/** 「10월 21일 14:05」 꼴의 짧은 시각. 시작 시각을 표 한 칸에 담으려고 연도 · 초를 뺀다 */
export function 시각글(iso: string | null, 언어: string): string {
  if (iso === null) return '-';
  return new Intl.DateTimeFormat(언어 === 'en' ? 'en-US' : 'ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}

/** 「14:05」 — 실행 로그 줄 앞의 시각 */
export function 시분(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}
