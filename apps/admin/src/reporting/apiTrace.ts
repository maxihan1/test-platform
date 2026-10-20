// API 케이스 절차의 요청 · 응답 원문을 증적에 실을 글 두 덩이로 편다 (도메인/API §3.8 「리포트 — 원문을 접어 넣는다」)

import type { ShapeCheck, StepResult } from '@platform/kit';

import { 가린다 } from '../execution/trial.js';

export interface EvidenceTrace {
  /** 메서드 · 주소 · 머리 · 본문 */
  request: string;
  /** 응답 코드 · 본문 · 잘렸으면 그 한 줄 */
  response: string;
}

type HttpTrace = NonNullable<StepResult['httpTrace']>;

// kit 이 가린 뒤 이 길이에서 자른다(packages/kit runtime/http.ts TRACE_BODY_LIMIT).
// ponytail: 자른 표시를 kit 이 안 남겨 꼭 2000자인 본문도 잘림으로 적힌다. 정확히 하려면 kit 이 truncated 를 싣는다
const 원문상한 = 2000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const 펼친다 = (값: unknown): string => (typeof 값 === 'string' ? 값 : JSON.stringify(값, null, 2));

/**
 * 항목 비밀값은 여기서 한 번 더 가린다 — 실행 조회 응답(execution/queries.ts)과 같은 규칙이다.
 * 잘렸는지는 가리기 전 길이로 본다 — 가리면 길이가 바뀐다. 없는 칸은 줄을 안 만든다
 */
export function 원문글(trace: HttpTrace, 비밀: string[] = []): EvidenceTrace {
  const 요청 = isPlainObject(trace.request) ? trace.request : {};
  const 응답 = isPlainObject(trace.response) ? trace.response : {};
  const 본문 = 응답.body === undefined ? '' : 펼친다(응답.body);
  const 첫줄 = [요청.method, 요청.url].filter((v) => v !== undefined).map(펼친다).join(' ');
  const 글 = (줄들: string[]): string => 가린다(줄들.join('\n'), 비밀) as string;
  return {
    request: 글([
      ...(첫줄 === '' ? [] : [첫줄]),
      ...(요청.headers === undefined ? [] : [`머리 ${펼친다(요청.headers)}`]),
      ...(요청.data === undefined ? [] : [`본문 ${펼친다(요청.data)}`]),
    ]),
    response: 글([
      ...(응답.status === undefined ? [] : [펼친다(응답.status)]),
      ...(본문 === '' ? [] : [본문]),
      ...(typeof 응답.body === 'string' && 응답.body.length >= 원문상한 ? [`… ${원문상한}자에서 잘림`] : []),
    ]),
  };
}

/**
 * 증적 절차에 붙일 API 칸. API 애플리케이션 항목만 싣는다 — 화면 케이스도 request 를 쓰면 원문이 저장되지만 문서에는 안 넣는다.
 * 원문은 절차마다 마지막 요청 하나다(kit 이 요청마다 덮어쓴다). 형식 검사는 그 절차의 요청 전부다
 */
export function api칸(
  row: { http_trace: HttpTrace | null; shape_checks: ShapeCheck[] | null },
  비밀: string[],
  api: boolean,
): { httpTrace?: EvidenceTrace; shapeChecks?: ShapeCheck[] } {
  if (!api) return {};
  return {
    ...(row.http_trace === null ? {} : { httpTrace: 원문글(row.http_trace, 비밀) }),
    // 문제 줄에 enum 밖 응답 값이 들 수 있어 절차 기록처럼 가린다 (도메인/API §3.8)
    ...(row.shape_checks === null ? {} : { shapeChecks: 가린다(row.shape_checks, 비밀) as ShapeCheck[] }),
  };
}
