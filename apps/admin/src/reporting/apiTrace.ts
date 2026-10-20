// API 케이스 절차의 요청 · 응답 원문을 증적에 실을 글 두 덩이로 편다 (도메인/API §3.8 「리포트 — 원문을 접어 넣는다」)

import type { StepResult } from '@platform/kit';

export interface EvidenceTrace {
  /** 메서드 · 주소 · 머리 · 본문 */
  request: string;
  /** 응답 코드 · 본문 · 잘렸으면 그 한 줄 */
  response: string;
}

// kit 이 가린 뒤 이 길이에서 자른다(packages/kit runtime/http.ts TRACE_BODY_LIMIT).
// ponytail: 자른 표시를 kit 이 안 남겨 꼭 2000자인 본문도 잘림으로 적힌다. 정확히 하려면 kit 이 truncated 를 싣는다
const 원문상한 = 2000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const 펼친다 = (값: unknown): string => (typeof 값 === 'string' ? 값 : JSON.stringify(값, null, 2));

/** 비밀값은 부르는 쪽이 이미 가렸다. 없는 칸은 줄을 안 만든다 — 빈 「머리」 줄은 머리가 없었던 것인지 못 읽은 것인지 모르게 한다 */
export function 원문글(trace: NonNullable<StepResult['httpTrace']>): EvidenceTrace {
  const 요청 = isPlainObject(trace.request) ? trace.request : {};
  const 응답 = isPlainObject(trace.response) ? trace.response : {};
  const 본문 = typeof 응답.body === 'string' ? 응답.body : '';
  return {
    request: [
      `${펼친다(요청.method ?? '')} ${펼친다(요청.url ?? '')}`,
      ...(요청.headers === undefined ? [] : [`머리 ${펼친다(요청.headers)}`]),
      ...(요청.data === undefined ? [] : [`본문 ${펼친다(요청.data)}`]),
    ].join('\n'),
    response: [
      펼친다(응답.status ?? ''),
      ...(본문 === '' ? [] : [본문]),
      ...(본문.length >= 원문상한 ? [`… ${원문상한}자에서 잘림`] : []),
    ].join('\n'),
  };
}
