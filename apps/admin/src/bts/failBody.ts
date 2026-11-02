// 실패 하나를 BTS 이슈 제목 · 본문 · 댓글 · 꼬리표로 옮기는 순수 함수 — 크기 상한 · 꼬리표 규칙 (도메인/BTS 「버그 바퀴」)
// DB 를 안 본다. 가리기는 부르는 쪽(failReport.ts)이 다 만든 글에 한 번 더 건다

import type { DeviceInfo, ItemStatus } from '@platform/kit';

import type { 실패유형 } from '../reporting/failureType.js';

/** BTS IssueTextConstraints.DESCRIPTION_MAX · COMMENT_BODY_MAX. BTS 는 글자로 세지만 여기는 바이트로 센다 — 한글이 3바이트라 늘 안에 든다 */
export const 본문상한 = 32767;
/** BTS IssueTextConstraints.SUMMARY_MAX */
export const 제목상한 = 255;
/** 첨부는 캡처 먼저 이 개수까지 (도메인/BTS 「크기 상한」) */
export const 첨부상한 = 5;

export type 꼬리표 = '버그 가능성 높음' | '테스트 문제 같음' | '흔들림 같음';

/**
 * AI 를 부르지 않고 규칙으로 고른다(BTS-F3-03 시작 질문 2026-10-31). 앞 실행들에서 통과와 실패가 섞였으면 흔들림이 먼저다 —
 * 같은 테스트가 오락가락하면 확인 문장이 틀렸어도 버그라고 하기 이르다. 앞실행 에 이번 실행을 넣지 않는다
 */
export function 꼬리표고르기(유형: 실패유형 | null, 앞실행: ItemStatus[]): 꼬리표 {
  if (앞실행.includes('PASS') && 앞실행.includes('FAIL')) return '흔들림 같음';
  return 유형 === 'mismatch' ? '버그 가능성 높음' : '테스트 문제 같음';
}

export interface 실패재료 {
  애플리케이션: string;
  tcId: string;
  tcName: string;
  env: string;
  build: string | null;
  device: DeviceInfo | null;
  steps: { title: string; status: ItemStatus }[];
  reqs: { reqId: string; text: string | null }[];
  /** 실패한 첫 확인 — 없으면 항목 오류로 실패한 것 */
  확인: { statement: string; expected: unknown; actual: unknown } | null;
  원인: string | null;
  /** trace 를 아직 안 풀었으면 null — 실행 뒤 따로 푼다(execution/traceIngest.ts) */
  네트워크: string[] | null;
  콘솔: string[] | null;
  결과주소: string | null;
  꼬리표: 꼬리표;
}

const 바이트 = (글: string): number => Buffer.byteLength(글, 'utf8');

const 짧게 = (값: unknown, 상한 = 300): string => {
  const 글 = typeof 값 === 'string' ? 값 : JSON.stringify(값) ?? String(값);
  return 글.length > 상한 ? `${글.slice(0, 상한)}…` : 글;
};

export function 이슈제목(재료: Pick<실패재료, '애플리케이션' | 'tcName'>): string {
  const 제목 = `[${재료.애플리케이션}] ${재료.tcName}`;
  return 제목.length > 제목상한 ? `${제목.slice(0, 제목상한 - 1)}…` : 제목;
}

function 환경줄(재료: 실패재료): string {
  const 칸 = [`대상 서버 ${재료.env}`];
  if (재료.build !== null) 칸.push(`빌드 ${재료.build}`);
  const d = 재료.device;
  if (d !== null) 칸.push(`디바이스 ${d.model} · Android ${d.osVersion} · 앱 ${d.appVersion}${d.appBuild ? ` (${d.appBuild})` : ''}`);
  return `**환경** — ${칸.join(' · ')}`;
}

function 앞뒤(재료: 실패재료): { 앞: string[]; 뒤: string[] } {
  const 앞 = [
    `**케이스** — ${재료.tcId}`,
    환경줄(재료),
    `**꼬리표** — ${재료.꼬리표} (Test Commander 규칙으로 붙였습니다)`,
    '',
    '### 재현 단계',
  ];
  const 실제 = [
    ...(재료.확인 === null
      ? []
      : [`- 실패한 확인: ${재료.확인.statement}`, `  - 기대 값: ${짧게(재료.확인.expected)}`, `  - 실제 값: ${짧게(재료.확인.actual)}`]),
    ...(재료.원인 === null ? [] : [`- 실패 원인: ${재료.원인}`]),
  ];
  const 기록 =
    재료.네트워크 === null || 재료.콘솔 === null
      ? ['네트워크 · 콘솔 기록은 Test Commander 실행 결과에서 보세요']
      : [
          ...(재료.네트워크.length === 0 ? ['- 실패한 네트워크 요청 없음'] : 재료.네트워크.map((n) => `- 요청: ${n}`)),
          ...(재료.콘솔.length === 0 ? ['- 콘솔 오류 없음'] : 재료.콘솔.map((c) => `- 콘솔: ${c}`)),
        ];
  const 뒤 = [
    '',
    '### 기대 (PRD)',
    ...(재료.reqs.length === 0 ? ['이 케이스가 덮는 PRD 요구가 없습니다'] : 재료.reqs.map((r) => `- ${r.reqId} ${r.text ?? ''}`.trimEnd())),
    '',
    '### 실제',
    ...(실제.length === 0 ? ['- 실패 원인을 가르지 못했습니다'] : 실제),
    '',
    '### 네트워크 · 콘솔',
    ...기록,
    ...(재료.결과주소 === null ? [] : ['', `Test Commander 실행 결과 — ${재료.결과주소}`]),
  ];
  return { 앞, 뒤 };
}

/** 상한을 넘으면 재현 단계를 뒤에서부터 덜어 내고 남은 수를 적는다 — 기대 · 실제 · 고리는 늘 남는다 */
export function 이슈본문(재료: 실패재료): string {
  const { 앞, 뒤 } = 앞뒤(재료);
  const 단계 = 재료.steps.map((s, i) => `${String(i + 1)}. ${s.title}${s.status === 'FAIL' ? ' ← 여기서 실패' : ''}`);
  for (let 남길 = 단계.length; 남길 >= 0; 남길--) {
    const 뺀수 = 단계.length - 남길;
    const 글 = [...앞, ...단계.slice(0, 남길), ...(뺀수 > 0 ? [`이하 ${String(뺀수)}단계는 Test Commander 실행 결과에서`] : []), ...뒤].join('\n');
    if (바이트(글) <= 본문상한) return 글;
  }
  // 단계를 다 빼도 넘으면 끝을 자른다 — 요구 문장 · 기록이 유난히 긴 경우뿐이다
  const 글 = [...앞, `이하 ${String(단계.length)}단계는 Test Commander 실행 결과에서`, ...뒤].join('\n');
  return Buffer.from(글, 'utf8').subarray(0, 본문상한 - 3).toString('utf8').replace(/�$/, '') + '…';
}

/** 열린 이슈에 다는 「또 실패」 댓글 */
export function 또실패댓글(재료: Pick<실패재료, 'env' | 'build' | '원인' | '결과주소' | '꼬리표'>, runId: number): string {
  return [
    `Test Commander 실행 #${String(runId)} 에서 또 실패했습니다 — 대상 서버 ${재료.env}${재료.build === null ? '' : ` · 빌드 ${재료.build}`}`,
    ...(재료.원인 === null ? [] : [`실패 원인: ${재료.원인}`]),
    `꼬리표: ${재료.꼬리표}`,
    ...(재료.결과주소 === null ? [] : [재료.결과주소]),
  ].join('\n');
}
