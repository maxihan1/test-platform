// 통과하지 못한 (실행, 케이스, 디바이스)를 원인 유형으로 나눈다 — 앱 대시보드 「실패 유형」 칸 (도메인/리포팅 §8.12)
// 새 칸 없이 이미 저장된 값(실패한 확인 문장 · 오류 원문)만 본다

/** 화면 표시 차례와 같다 */
export const 실패유형들 = ['mismatch', 'notFound', 'timeout', 'environment', 'other'] as const;
export type 실패유형 = (typeof 실패유형들)[number];
/** 실행이 멈춰 닫힌 미실행(ABORTED)은 유형에 넣지 않고 따로 센다 — 사람이 멈춘 것인지 서버가 다시 뜨며 닫은 것인지 DB 가 못 가른다(reporting/collect.ts 와 같은 판단) */
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
export const 색코드 = /\u001b\[[0-9;]*m/g;
// net::ERR_ABORTED 는 앱이 스스로 이동을 끊은 것이라 뺀다
const 연결끊김 = /net::ERR_(?!ABORTED)|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|EHOSTUNREACH|socket hang up|fetch failed/;
const 요소대기 = /waiting for (locator|getBy|selector)|element\(s\) not found|no such element|could not be located/i;
// 서버가 미실행에 넣는 러너 사유(execution/runner.ts · farm.ts — 러너에 닿지 못함 · 러너가 거절 · 디바이스 팜 없음 · 팜이 폰을 못 내줌).
// 「로컬 러너」는 2026-10-20 APP-F1-10 전 기록에 남은 글이다. 글 머리만 본다 —
// 어디든 「러너」가 들어 있나로 보면 「러너 상태」 같은 요소를 기다린 케이스까지 러너 고장이 된다
// 2026-11-02 「디바이스 팜」이 「Device VISION」이 됐다 — 이미 저장된 옛 문장도 같은 유형으로 가른다
const 러너사유 = /^(러너에 닿지 못했습니다|러너가 |이 서버에는 .*(로컬 러너|디바이스 팜|Device VISION)|디바이스 팜|Device VISION)/;
// 기다리던 요소를 찾고 나서(보이지 않음 · 누를 수 없음) 시간이 다 된 것은 「못 찾음」이 아니다
const 요소찾음 = /resolved to/;
const 시간초과 = /^TIMEOUT\b|Timeout \d+ms exceeded|Test timeout of/;
// 게임 드라이버 오류 문구(control_cli SDK · kit 게임 몸통 — 도메인/게임 「실행 결과」). 연결이 끊긴 것이 먼저다 —
// 「게임이 120초 안에 답하지 않았습니다 — 게임 포트 13100 에 붙지 못했습니다」(켜지기 기다림 실패)는 시간 초과가 아니라 환경이다
const 게임연결끊김 = /게임 포트 \d+ 에 붙지 못했습니다|게임이 답 없이 연결을 닫았습니다|(디바이스 팜이|Device VISION 이) 게임 명령을 HTTP \d+ 로 거절했습니다/;
const 게임요소없음 = /켜진 오브젝트 중에 .+ 이 없습니다/;
const 게임시간초과 = /초 안에 (뜨지 |사라지지 |「.*」이 되지 )않았습니다|게임이 [\d.]+초 안에 답하지 않았습니다/;

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
  if (연결끊김.test(글) || 게임연결끊김.test(글) || (재료.status === 'NA' && 러너사유.test(항목))) return 'environment';
  if ((요소대기.test(글) && !요소찾음.test(글)) || 게임요소없음.test(글)) return 'notFound';
  if (시간초과.test(글) || 게임시간초과.test(글)) return 'timeout';
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

/**
 * 대표 문장 한 줄의 상한. 검증 문장은 사람이 쓴 짧은 한국어라 여기 안 걸리고,
 * 여기 걸리는 것은 러너가 뱉은 오류 원문뿐이다.
 */
const 대표문장길이 = 120;

/**
 * 대표 문장을 **첫 줄 + 상한**으로 자른다. DB 를 안 끌어오는 이 파일에 둬야 화면(E2E 마법사 시험 결과)도 itemFailure.ts 를 부른다.
 *
 * **셋을 한꺼번에 막는다.**
 * ① 검증 문장이 없는 실패는 `error.message` 가 대표인데, 그 값은 러너가 stderr 를 2000자 안으로 줄여 실어 보낸 것이다
 *    (`apps/runner/src/execute.ts` 의 `tail()` — 1000자 넘는 첫 줄은 빠져 「…」로 시작한다, 도메인/러너 §5.2). 경로·줄번호·시간이 섞여 있어
 *    **같은 고장이 실행마다 다른 글자가 되고 묶기가 한 덩어리도 못 만든다** — 건수 1짜리가 줄줄이 선다.
 *    묶어서 볼 값어치가 가장 큰 것이 바로 그런 실패(문법 오류·import 실패·러너 장애)다
 * ② 「**원문 오류(스택·주소·포트)는 목록에 쓰지 않는다**」가 이 저장소 규칙이다
 *    (`web/runState.ts`). 이 도구의 전제는 「코드를 몰라도 쓴다」다
 * ③ actual·expected 를 안 붙여 막은 비밀값이 **stderr 의 `Expected:`/`Received:` 블록으로 되돌아온다.**
 *    Playwright 가 그것을 통째로 뱉는다
 *
 * 원문은 항목 상세가 그대로 갖고 있다. 여기서 자르는 것은 **요약 자리에 원문을 두지 않는 것**이다.
 */
export function 한줄로자른다(문장: string): string {
  // Playwright 원문은 색 코드와 빈 첫 줄로 시작하기도 한다(「\u001b[2m\n Error…」) — 그대로 첫 줄을 고르면 빈 사유나 색 코드가 나온다
  const 첫줄 =
    문장
      .replace(색코드, '')
      .split('\n')
      .map((줄) => 줄.trim())
      .find((줄) => 줄 !== '') ?? '';
  return 첫줄.length > 대표문장길이 ? `${첫줄.slice(0, 대표문장길이)}…` : 첫줄;
}
