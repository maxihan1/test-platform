// 증적 항목 옆에 적을 사유 — 아예 못 돈 항목 · 판정을 못 낸 항목 · 예외로 깨진 항목 (도메인/리포팅 §8.4 「엑셀 표 모양」 · 실행 §3.2 「판정이 아닌 결과」)
// collect.ts 가 300줄을 넘어 뗐다. 미실행 줄의 까닭은 실행 쪽 한 곳(execution/notVerdict.ts)이 가른다 — 리포팅이 status 와 error.message 를 따로 읽지 않는다

import { 판정아닌까닭을가른다 } from '../execution/notVerdict.js';
import { 가린다 } from '../execution/trial.js';
import { 색코드, 한줄로자른다 } from './failureType.js';

export type RunStatus = 'RUNNING' | 'FINISHED' | 'ABORTED' | 'PREP_FAILED';

/** 사유를 가르는 데 쓰는 항목 칸 */
interface 사유재료 {
  status: string;
  error: unknown;
  finished_at: Date | null;
}

interface 절차재료 {
  assertions: { status: string }[];
  error: unknown;
}

// 준비 실패로 닫힌 항목 — 데이터 준비가 안 된 것이지 서비스 결함이 아니다 (도메인/실행 §3.2 「실행 전 준비」)
const 준비실패사유 = '테스트 데이터 준비에 실패해 수행되지 않았습니다';

// 검수처가 읽을 한 문장이다. 「40건 중 12건 돌았고 28건은 이래서 못 돌았다」가 증적으로 성립해야 한다 (SPEC §8.4)
const 미실행사유: Record<RunStatus, string> = {
  // 아래 미실행사유를찾는다() 의 error 갈래와 같은 문장이다. 사람이 멈춘 것인지
  // 서버가 죽어 recoverRunning() 이 닫은 것인지 DB 가 구분하지 못한다 (SPEC §6)
  ABORTED: '실행이 중단되어 수행되지 않았습니다',
  RUNNING: '아직 실행 중입니다',
  // 러너 결과를 저장하다 실패한 행이 여기로 온다. 증적이 그 상태를 숨기면 안 된다
  FINISHED: '실행이 완료되었지만 결과가 기록되지 않았습니다',
  PREP_FAILED: 준비실패사유,
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// 없으면 지어내지 않는다. 빈 문장을 배지 옆에 붙이면 사유를 적은 척만 하게 된다
export const 오류글 = (error: unknown): string => (isPlainObject(error) && typeof error.message === 'string' ? error.message : '');

/** 앞 케이스에 막혀 끝난 줄인가 — 실행 쪽 한 곳의 판단이다 */
export const Blocked인가 = (row: Pick<사유재료, 'status' | 'error'>): boolean => 판정아닌까닭을가른다(row.status, 오류글(row.error)) === 'BLOCKED';

// 돌지 못한 항목을 가려낸다. 사유를 돌려주면 미실행, null 이면 그대로 담는다.
// 판별이 두 갈래인 것은 닫는 쪽이 둘이기 때문이다 — 아무도 안 닫은 행과 중단 처리가 닫은 행
export function 미실행사유를찾는다(row: 사유재료, 실행상태: RunStatus): string | null {
  const 까닭 = 판정아닌까닭을가른다(row.status, 오류글(row.error));
  // 중단 처리(store.ts CLOSE_UNFINISHED)는 finished_at 을 채우고 간다. error 말고는 가려낼 표가 없다.
  // recoverRunning() 도 같은 문자열을 쓴다. 사람이 멈춘 것인지 서버가 죽어 끊긴 것인지 DB 가 구분하지 못하므로 구분하는 척하지 않는다 (SPEC §6)
  if (까닭 === 'ABORTED' || (row.status === 'NA' && 오류글(row.error) === 'STOPPED')) return '실행이 중단되어 수행되지 않았습니다';
  if (까닭 === 'PREP_FAILED') return 준비실패사유;
  // 아무도 안 닫은 행. 러너 결과를 저장하다 실패했거나 프로세스가 도중에 죽었다
  if (row.finished_at === null) return 미실행사유[실행상태];
  // 그 밖의 NA 는 돌다가 판정을 못 낸 것이지 안 돈 것이 아니다. 손대지 않는다
  return null;
}

// 위 함수가 null 을 준 NA — 돌긴 돌았는데 판정을 못 낸 항목이다. 판정과 소요시간은 그대로 두고
// 사유만 채운다. 사유 없이 미실행으로 두면 러너 고장과 사람이 멈춘 것을 구분할 수 없다 (SPEC §8.3)
// 확인 문장 없이 예외로 깨진 FAIL 도 사유가 없으면 왜 깨졌는지 문서에 없다. 원문은 스택 · 경로가 섞여 첫 줄만 싣는다 (리포팅 §8.4)
// Blocked 는 null 이다 — 막은 케이스 번호로 적는 사유는 문서의 항목이 다 모인 뒤 채운다(collectProc.ts 막힘을채운다)
export function 돈항목사유(row: Pick<사유재료, 'status' | 'error'>, 절차들: 절차재료[], 비밀: string[]): string | null {
  if (row.status === 'NA') {
    const 원문 = 오류글(row.error);
    const 까닭 = 판정아닌까닭을가른다(row.status, 원문);
    if (까닭 === 'BLOCKED') return null;
    // 러너가 끊은 TIMEOUT 과 kit 이 케이스 한도에서 끊은 「Test timeout of …」는 사람에게 같은 말이다 — 화면 미실행 사유와 같은 글자다(web/runState.ts)
    if (까닭 === 'TIMEOUT') return '제한 시간 초과';
    return 원문 === '' ? null : (가린다(원문, 비밀) as string);
  }
  if (row.status !== 'FAIL' || 절차들.some((s) => s.assertions.some((a) => a.status === 'FAIL'))) return null;
  // 항목 오류가 먼저다. 절차 오류로 넘어가는 것은 증적만이다 — 화면 실패 카드 · 견주기는 항목 오류만 본다 (리포팅 §8.4)
  // 색 코드를 지우고 앞뒤를 걷어야 「\u001b[2m\n Error…」처럼 빈 첫 줄로 시작하는 원문도 사유가 남는다
  const 원문 = [row.error, ...절차들.map((s) => s.error)]
    .map((e) => 오류글(e).replace(색코드, '').trim())
    .find((m) => m !== '');
  // 자르기 전에 가린다. 잘린 자리에 비밀 조각이 남는다
  return 원문 === undefined ? null : 한줄로자른다(가린다(원문, 비밀) as string);
}
