// 통과하지 못한 (실행, 케이스, 디바이스)를 원인 유형으로 나눈다 — 앱 대시보드 「실패 유형」 칸 (도메인/리포팅 §8.12)
// 새 칸 없이 이미 저장된 값(실패한 확인 문장 · 오류 원문)만 본다

/** 화면 표시 차례와 같다 */
export const 실패유형들 = ['mismatch', 'notFound', 'timeout', 'environment', 'other'] as const;
export type 실패유형 = (typeof 실패유형들)[number];
/** 사용자가 멈춘 미실행은 원인이 아니라 유형에 넣지 않고 따로 센다 */
export type 원인 = 실패유형 | 'stopped';

export interface 원인재료 {
  /** 접은 판정이 고른 항목의 판정 — 실패가 있으면 실패 항목, 없으면 미실행 항목 */
  status: 'FAIL' | 'NA';
  assertFailed: boolean;
  /** 항목 오류 원문. 서버가 넣은 러너 사유 · 러너의 `TIMEOUT` · `ABORTED` 는 여기에만 있다. 없으면 '' */
  itemMessage: string;
  /** 첫 절차 오류 원문. 테스트 제한 시간 미실행은 항목 쪽에 「Test timeout」만 있고 기다리던 요소는 여기 있다. 없으면 '' */
  stepMessage: string;
}

// Playwright 는 오류 글에 색 코드를 섞는다(「\u001b[31mTest timeout…」) — 지우지 않으면 글 맞추기가 빗나간다
const 색코드 = /\u001b\[[0-9;]*m/g;
// net::ERR_ABORTED 는 앱이 스스로 이동을 끊은 것이라 뺀다
const 연결끊김 = /net::ERR_(?!ABORTED)|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|EHOSTUNREACH|socket hang up|fetch failed/;
const 요소대기 = /waiting for (locator|getBy|selector)|element\(s\) not found|no such element|could not be located/i;
// 서버가 미실행에 넣는 러너 사유(execution/runner.ts — 러너에 닿지 못함 · 러너가 거절 · 로컬 러너 없음). 글 머리만 본다 —
// 어디든 「러너」가 들어 있나로 보면 「러너 상태」 같은 요소를 기다린 케이스까지 러너 고장이 된다
const 러너사유 = /^(러너에 닿지 못했습니다|러너가 |이 서버에는 .*로컬 러너)/;
// 기다리던 요소를 찾고 나서(보이지 않음 · 누를 수 없음) 시간이 다 된 것은 「못 찾음」이 아니다
const 요소찾음 = /resolved to/;
const 시간초과 = /^TIMEOUT\b|Timeout \d+ms exceeded|Test timeout of/;

/**
 * 차례가 곧 규칙이다 — 확인 문장 실패가 먼저다. 그 문장이 기대와 실제를 이미 판정했다.
 * 동작 제한 시간(actionTimeout)을 두지 않아 요소를 못 찾은 케이스는 테스트 제한 시간까지 기다려 미실행이 된다 —
 * 그래서 요소 대기를 시간 초과보다 먼저 본다.
 * 넷 중 어디에도 안 맞으면 「그 밖」이다. 모르는 것을 넷 중 하나로 지어내지 않는다
 */
export function 원인을가른다(재료: 원인재료): 원인 {
  const 항목 = 재료.itemMessage.replace(색코드, '');
  const 글 = `${항목}\n${재료.stepMessage.replace(색코드, '')}`;
  if (재료.status === 'NA' && /^ABORTED\b/.test(항목)) return 'stopped';
  if (재료.assertFailed) return 'mismatch';
  if (연결끊김.test(글) || (재료.status === 'NA' && 러너사유.test(항목))) return 'environment';
  if (요소대기.test(글) && !요소찾음.test(글)) return 'notFound';
  if (시간초과.test(글)) return 'timeout';
  return 'other';
}

export interface 유형셈 {
  유형별: { type: 실패유형; 실패: number; 미실행: number }[];
  멈춤: number;
}

export function 유형을센다(줄들: { verdict: 'PASS' | 'FAIL' | 'NA'; cause: 원인 | null }[]): 유형셈 {
  const 셈 = new Map(실패유형들.map((type) => [type, { type, 실패: 0, 미실행: 0 }]));
  let 멈춤 = 0;
  for (const 줄 of 줄들) {
    if (줄.verdict === 'PASS' || 줄.cause === null) continue;
    if (줄.cause === 'stopped') {
      멈춤 += 1;
      continue;
    }
    const 칸 = 셈.get(줄.cause)!;
    if (줄.verdict === 'FAIL') 칸.실패 += 1;
    else 칸.미실행 += 1;
  }
  return { 유형별: [...셈.values()], 멈춤 };
}
