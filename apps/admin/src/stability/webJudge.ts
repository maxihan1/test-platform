// 웹 항목 하나의 콘솔 · 네트워크 줄에서 안정화 지표가 세는 오류를 골라 지문마다 묶는다 (도메인/안정화 §3.15 「무엇을 세나」 · 결정 4)

import { 웹네트워크지문, 웹콘솔지문, type 지문 } from './fingerprint.js';

export interface 콘솔줄 {
  ord: number;
  seq: number | null;
  atMs: number;
  level: string;
  text: string;
  url: string | null;
}

export interface 네트워크줄 {
  ord: number;
  seq: number | null;
  atMs: number;
  method: string;
  url: string;
  status: number | null;
  resourceType: string;
  failure: string | null;
}

export interface 센오류 extends 지문 {
  hits: number;
  seq: number | null; // 그 항목에서 처음 난 단계
  page: string; // 화면 주소 — 웹 줄은 trace 풀기가 이미 가렸다
  sample: string;
}

export const 견본상한 = 8_000;

const 실패인가 = (n: 네트워크줄): boolean => (n.status !== null && n.status >= 400) || (n.status === null && n.failure !== null);

function 첫화면(대상주소: string): string {
  try {
    return new URL('/', 대상주소).href;
  } catch {
    return '';
  }
}

/**
 * 예외 축 케이스는 네트워크 실패 줄만 뺀다. 메아리 콘솔 줄(`Failed to load resource` · 실패 네트워크 줄과 주소가 같은 error)은 축과 상관없이 뺀다 —
 * 같은 실패가 네트워크 줄로 한 번 들어온다. 같은 지문이 여러 번이면 횟수만 더한다
 */
export function 웹항목오류(콘솔: readonly 콘솔줄[], 네트워크: readonly 네트워크줄[], 예외축: boolean, 대상주소: string): 센오류[] {
  const 기본화면 = 첫화면(대상주소);
  const 이동 = 네트워크.filter((n) => n.resourceType === 'document').sort((a, b) => a.atMs - b.atMs || a.ord - b.ord);
  const 화면 = (앞인가: (n: 네트워크줄) => boolean): string => 이동.filter(앞인가).at(-1)?.url ?? 기본화면;
  const 실패 = 네트워크.filter(실패인가);
  const 실패주소 = new Set(실패.map((n) => n.url));

  const 모음 = new Map<string, 센오류>();
  const 넣기 = (지: 지문, seq: number | null, page: string, sample: string): void => {
    const 있던 = 모음.get(지.fingerprint);
    if (있던 !== undefined) {
      있던.hits += 1;
      return;
    }
    모음.set(지.fingerprint, { ...지, hits: 1, seq, page, sample: sample.slice(0, 견본상한) });
  };

  for (const c of [...콘솔].sort((a, b) => a.ord - b.ord)) {
    if (c.level !== 'pageerror' && c.level !== 'error') continue;
    if (c.level === 'error' && (c.text.startsWith('Failed to load resource') || (c.url !== null && 실패주소.has(c.url)))) continue;
    const page = 화면((n) => n.atMs <= c.atMs);
    넣기(웹콘솔지문(c.level, c.text, page), c.seq, page, c.text);
  }
  if (!예외축) {
    for (const n of [...실패].sort((a, b) => a.ord - b.ord)) {
      // 콘솔 줄과 같은 시각 기준 — 같은 실패의 네트워크 줄과 콘솔 줄이 다른 화면으로 갈리지 않게. 이동 줄 자신은 그 앞 화면에 둔다
      const page = 화면((d) => d.ord !== n.ord && d.atMs <= n.atMs);
      넣기(웹네트워크지문(n.status, n.method, n.url, page), n.seq, page, `${n.method.toUpperCase()} ${n.url} → ${n.status ?? n.failure}`);
    }
  }
  return [...모음.values()];
}

/** 축이 여럿이면 하나라도 예외면 예외 케이스다 */
export const 예외축인가 = (axes: readonly string[]): boolean => axes.includes('예외');
