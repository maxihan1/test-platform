// 페이지 성능 화면의 계산 — 목표 넘음 · 부하 중 값 · 워터폴 막대 (도메인/성능 §3.9 「페이지 성능」)

import type { Compare, PageRow, 리소스 } from './perfPageApi.js';

/** 목표는 고정이다 — 화면에서 고치는 칸이 없다 (§3.9 「목표는 고정이다」). LCP · FCP 는 ms 다 */
export const 목표 = { lcpMs: 2500, fcpMs: 1800, cls: 0.1 };

export const 넘음 = {
  lcp: (ms: number | null): boolean => ms !== null && ms > 목표.lcpMs,
  fcp: (ms: number | null): boolean => ms !== null && ms > 목표.fcpMs,
  cls: (값: number | null): boolean => 값 !== null && 값 > 목표.cls,
};

/** CLS 는 단위 없이 소수 둘째까지 */
export const 클글자 = (값: number | null): string => (값 === null ? '-' : 값.toFixed(2));

/** 비교 실행에서 그 페이지의 LCP. PAGE 실행이면 부하 중 값, LOAD 실행이면 단독 측정 값이다 */
export const 비교값 = (비교: Compare | null, url: string): number | null => 비교?.pages.find((it) => it.url === url)?.lcpMs ?? null;

/** 처음 고르는 줄 — 먼저 봐야 할 실패가 있으면 그것, 없으면 첫 줄 */
export const 처음고른 = (줄들: PageRow[]): string | null => (줄들.find((줄) => 줄.verdict === 'FAIL') ?? 줄들[0])?.url ?? null;

export interface 막대 {
  이름: string;
  durationMs: number;
  /** 막대 위치 · 너비 (%) */
  왼쪽: number;
  너비: number;
  /** 가장 오래 걸린 막대 */
  뜨거움: boolean;
}

/** 워터폴에 그릴 문서 하나 + 오래 걸린 리소스 일곱 개를 시작 차례로 */
export const 워터폴칸수 = 7;

export function 워터폴막대(줄: PageRow): 막대[] {
  const 문서 = 줄.resources.filter((it) => it.type === 'document').sort((a, b) => a.startMs - b.startMs)[0];
  const 나머지 = 줄.resources.filter((it) => it !== 문서).sort((a, b) => b.durationMs - a.durationMs).slice(0, 워터폴칸수);
  const 고름: 리소스[] = [...(문서 === undefined ? [] : [문서]), ...나머지].sort((a, b) => a.startMs - b.startMs);
  // 전체 = LCP 와 마지막 리소스 끝 중 큰 값 — 어느 쪽이 길어도 막대가 칸 밖으로 안 나간다
  const 전체 = Math.max(1, 줄.lcpMs ?? 0, ...고름.map((it) => it.startMs + it.durationMs));
  const 가장긴 = Math.max(0, ...고름.map((it) => it.durationMs));
  return 고름.map((it) => ({
    이름: it.name,
    durationMs: it.durationMs,
    왼쪽: (it.startMs / 전체) * 100,
    너비: (it.durationMs / 전체) * 100,
    뜨거움: 가장긴 > 0 && it.durationMs === 가장긴,
  }));
}

/** 페이지마다 가장 최근(초가 가장 큰) 표본 — 부하 중 측정이 여러 번 쌓인다 */
export function 페이지별최근(줄들: PageRow[]): PageRow[] {
  const 최근 = new Map<string, PageRow>();
  for (const 줄 of 줄들) if ((최근.get(줄.url)?.sec ?? -1) <= (줄.sec ?? 0)) 최근.set(줄.url, 줄);
  return [...최근.values()];
}

/** 표 위 숫자 칸 줄 — LCP · FCP 평균과 목표 넘은 페이지 (시안 11판 「페이지 성능」 · WEB-F7-16). 값이 없는 페이지는 평균에서 뺀다 */
export function 숫자칸(줄들: PageRow[]): { lcp평균: number | null; fcp평균: number | null; 넘은: string[] } {
  const 평균 = (v: (number | null)[]) => {
    const 값 = v.filter((x): x is number => x !== null);
    return 값.length === 0 ? null : 값.reduce((a, b) => a + b, 0) / 값.length;
  };
  return {
    lcp평균: 평균(줄들.map((줄) => 줄.lcpMs)),
    fcp평균: 평균(줄들.map((줄) => 줄.fcpMs)),
    넘은: 줄들.filter((줄) => 줄.verdict === 'FAIL').map((줄) => 줄.name),
  };
}

/**
 * 전체 로드 · 요청 수 — 수집한 리소스 끝 시각 중 가장 늦은 것과 리소스 수 (시안 11판 「페이지 성능」 · WEB-F7-18).
 * ponytail: 수집 스크립트(perf/pageScript.ts)가 리소스를 문서 + 99개까지만 남겨 그보다 많은 페이지는 요청 수가 100 에서 멈춘다. 늘리려면 수집 상한부터
 */
export function 로드요약(줄: PageRow): { 전체로드Ms: number | null; 요청수: number } {
  return {
    전체로드Ms: 줄.resources.length === 0 ? null : Math.max(...줄.resources.map((it) => it.startMs + it.durationMs)),
    요청수: 줄.resources.length,
  };
}
