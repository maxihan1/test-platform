// 자식 프로세스가 끝난 뒤 러너의 답을 만든다 — 앞 꼴은 결과 한 건, 새 꼴은 케이스마다 한 건이다 (SPEC 도메인/러너 §5.2 · 「프로시저 실행」)

import { stripVTControlCharacters } from 'node:util';

import type { CaseResult, CasesExecuteResponse, ExecuteCase, ExecuteResponse, ItemStatus } from '@platform/kit';
import { BLOCKED } from '@platform/kit/protocol';

import { kit경고뺌, parseCaseResults, parseResult, type RunnerResult } from './result.js';

// 왜 죽였는지. 판정은 둘 다 NA지만 사람이 보는 사유가 갈린다 (SPEC §5.2)
export type KilledBy = 'TIMEOUT' | 'ABORTED';

/** 자식이 어떻게 끝났나 — 답을 만드는 데 드는 것 */
export interface 끝난자식 {
  killedBy: KilledBy | null;
  code: number | null;
  // 프로세스를 띄운 때(ms)
  startedAt: number;
  stdout: string;
  stderr: string;
}

export function statusFromExit(code: number | null, timedOut: boolean): ItemStatus {
  // 타임아웃은 통과도 실패도 아니다. 판정할 근거가 없으므로 NA다 (SPEC §5.2)
  if (timedOut) return 'NA';
  return code === 0 ? 'PASS' : 'FAIL';
}

// 앞을 그냥 잘라 내면 남은 글의 첫 줄이 원문 중간 줄(Received: …)이 되는데, admin 요약 자리는 그 첫 줄을 사유로 쓴다
// (insights.ts 한줄로자른다). 줄 중간을 자르면 가리기가 못 알아보는 비밀값 조각도 남는다 — 그래서 첫 줄을 지키고 뒤는 줄 경계에서 자른다
// Playwright 는 오류 글에 색 코드를 섞는데(「\u001b[31m…」) admin 요약은 첫 줄을 그대로 쓰니 여기서 걷는다
export function tail(text: string): string {
  const trimmed = stripVTControlCharacters(text).trim();
  if (trimmed.length <= 2000) return trimmed;
  const 줄끝 = trimmed.indexOf('\n');
  // 1000자 넘는 첫 줄은 자르지 않고 통째로 뺀다. 어디를 잘라도 그 자리에 걸친 비밀값이 조각으로 남고,
  // 줄 가운데를 안 자르니 이모지 반쪽(jsonb 가 받지 않는다)도 생기지 않는다
  const 첫줄 = 줄끝 === -1 || 줄끝 > 1000 ? '' : trimmed.slice(0, 줄끝);
  // 한 글자 더 앞에서 떠야 창이 마침 줄 첫머리에서 시작할 때 그 줄을 버리지 않는다.
  // 창에 줄바꿈이 없으면 창 전체가 한 줄의 조각이라 통째로 버린다
  const 창 = trimmed.slice(-(2000 - 첫줄.length - 2));
  const 경계 = 창.indexOf('\n');
  const 뒤 = 경계 === -1 ? '' : 창.slice(경계 + 1);
  return [첫줄, '…', 뒤].filter((줄) => 줄 !== '').join('\n');
}

// 타임아웃으로 프로세스를 죽이면 결과 줄이 잘려 있을 수 있다. 그건 러너 고장이 아니라 중단의 흔적이다.
// 스스로 끝난 프로세스의 못 읽는 결과 줄은 여기 오기 전에 앞 꼴 답을 만들다 던진다
function parseAfterKill(stdout: string): RunnerResult | null {
  try {
    return parseResult(stdout);
  } catch (err) {
    console.warn(`[runner] 중단된 실행의 결과 줄을 버린다: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

// 끊긴 실행은 타임아웃과 같은 모양으로 돌아온다. error.message만 갈린다 —
// 모양이 같아야 admin의 저장 경로에 새 분기가 생기지 않는다 (SPEC §5.2)
export function killedResponse(
  historyId: number,
  killedBy: KilledBy,
  durationMs: number,
  stdout: string,
): ExecuteResponse {
  return {
    historyId,
    status: 'NA',
    durationMs,
    // 부분 결과라도 있으면 그대로 넘긴다. 어디까지 갔는지가 사람에게는 정보다
    steps: parseAfterKill(stdout)?.steps ?? [],
    error: { message: killedBy },
  };
}

/** 앞 꼴 답 — 리포터가 뱉은 결과 한 줄에서 온다. 줄이 없으면 종료 코드로 가른다 */
export function 앞꼴응답(historyId: number, 자식: 끝난자식, fps칸: Pick<ExecuteResponse, 'fps'>): ExecuteResponse {
  if (자식.killedBy !== null) {
    return { ...killedResponse(historyId, 자식.killedBy, Date.now() - 자식.startedAt, 자식.stdout), ...fps칸 };
  }

  const parsed = parseResult(자식.stdout);
  if (parsed !== null) {
    return {
      historyId,
      status: parsed.status,
      durationMs: parsed.durationMs,
      steps: parsed.steps,
      ...(parsed.error === undefined ? {} : { error: parsed.error }),
      // 앱 항목의 폰 · 앱 판. 증적 머리에 싣는다 (도메인/리포팅 §8.4 · APP-F1-05)
      ...(parsed.device === undefined ? {} : { device: parsed.device }),
      // 게임 항목만 — admin 이 게임 지도 · 서비스 지도에 쓴다 (공통/3-공유계약 「게임 테스트 타입」)
      ...(parsed.elementChecks === undefined ? {} : { elementChecks: parsed.elementChecks }),
      ...(parsed.apiCalls === undefined ? {} : { apiCalls: parsed.apiCalls }),
      ...fps칸,
    };
  }

  // 리포터가 결과를 못 뱉었다 = 케이스가 아예 안 돌았다(문법 오류·import 실패 등). exit code로만 판정한다
  const status = statusFromExit(자식.code, false);
  return {
    historyId,
    status,
    durationMs: Date.now() - 자식.startedAt,
    steps: [],
    ...(status === 'PASS' ? {} : { error: { message: tail(kit경고뺌(자식.stderr)) || tail(자식.stdout) } }),
    ...fps칸,
  };
}

const 줄없음글 = '케이스 판정 줄 없이 프로세스가 끝났다';

// kit 은 보류가 아닌 케이스가 하나라도 통과가 아니면 테스트를 실패로 끝낸다 — 그런 판정인가.
// 미실행 가운데 보류 · 바뀐 프로시저는 돌지 않은 것이라 시작한 때도 막은 케이스도 없다
const 실패로끝낼판정인가 = (r: CaseResult): boolean =>
  r.status === 'FAIL' || (r.status === 'NA' && (r.error?.message === BLOCKED || r.startedAt !== undefined));

/**
 * 새 꼴 답 — 케이스마다 한 건. 받은 판정 줄을 그대로 쓰고 줄이 없는 케이스만 표대로 채운다.
 * Blocked 를 정하는 것은 kit 이라 러너가 채우는 것은 kit 이 줄을 못 낸 때뿐이다 (도메인/러너 §5.2 「프로시저 실행」 「못 간 케이스 채우기」).
 * 앞답 은 같은 자식을 앞 꼴로 읽은 답이다 — 리포터 결과 줄이나 종료 코드에서 온다
 */
export function 케이스응답(cases: readonly ExecuteCase[], 앞답: ExecuteResponse, 자식: 끝난자식, 지금 = Date.now()): CasesExecuteResponse {
  // 같은 케이스의 줄이 다시 오면 뒤 것을 쓴다 — 끝 정리 절차를 더한 줄이다. 요청에 없는 케이스의 줄은 버린다
  const 줄 = new Map(parseCaseResults(자식.stdout).map((r) => [r.tcId, r]));
  const 받은 = cases.map((c) => 줄.get(c.tcId));
  // 리포터 결과 줄의 절차 가운데 그 케이스 것 — 옛 꼴 파일의 절차에는 케이스 번호가 없다
  const 절차 = (c: ExecuteCase) => 앞답.steps.filter((s) => s.tcId === undefined || s.tcId === c.tcId);
  // 스스로 끝난 프로세스의 오류 글 — 리포터가 남긴 사유가 있으면 그것, 없으면 stderr, 비었으면 stdout 꼬리다. kit 이 흘린 줄(@@…)은 사람이 읽을 글이 아니라 뺀다
  const 오류글 = (): string => {
    const 출력글 = 자식.stdout.split('\n').filter((줄) => !줄.startsWith('@@')).join('\n');
    return parseAfterKill(자식.stdout)?.error?.message ?? (tail(kit경고뺌(자식.stderr)) || tail(출력글) || 줄없음글);
  };
  const 머리 = {
    historyId: 앞답.historyId,
    durationMs: 지금 - 자식.startedAt,
    ...(앞답.device === undefined ? {} : { device: 앞답.device }),
    ...(앞답.fps === undefined ? {} : { fps: 앞답.fps }),
  };
  const 끊김 = 자식.killedBy === null ? {} : { error: { message: 자식.killedBy } };

  // 줄이 하나도 없다 — 옛 꼴 파일이거나, 프로시저 파일을 못 읽었거나, 첫 줄이 나기 전에 끊겼다.
  // 케이스마다 지금 꼴 그대로다 — 리포터 결과 줄이 있으면 그 판정 · 사유, 없으면 종료 코드로 가른 것(끊겼으면 NA + 그 사유)
  if (받은.every((r) => r === undefined)) {
    // 케이스가 여럿인데 줄이 하나도 없으면 통과로 치지 않는다 — 결과 줄 하나의 통과가 케이스 전부의 통과가 되어 버린다
    const 못믿음 = 앞답.status === 'PASS' && cases.length > 1;
    const error = 못믿음 ? { message: 줄없음글 } : 앞답.error;
    return {
      ...머리,
      results: cases.map((c, i) => ({
        tcId: c.tcId,
        status: 못믿음 ? 'FAIL' : 앞답.status,
        durationMs: i === 0 ? 앞답.durationMs : 0,
        steps: 절차(c),
        ...(error === undefined ? {} : { error }),
        ...(i === 0 && 앞답.elementChecks !== undefined ? { elementChecks: 앞답.elementChecks } : {}),
        ...(i === 0 && 앞답.apiCalls !== undefined ? { apiCalls: 앞답.apiCalls } : {}),
      })),
      ...끊김,
    };
  }

  // 케이스는 차례대로만 돌아 줄이 없는 첫 케이스가 돌던 케이스다. 그 케이스의 시계는 앞 케이스가 끝난 때부터다
  const 돌던 = 받은.findIndex((r) => r === undefined);
  const 돌던시작 = 받은.flatMap((r) => (r?.finishedAt === undefined ? [] : [Date.parse(r.finishedAt)])).at(-1) ?? 자식.startedAt;
  const results = cases.map((c, i): CaseResult => {
    const r = 받은[i];
    if (r !== undefined) return r;
    const 빈 = { tcId: c.tcId, status: 'NA' as const, durationMs: 0, steps: 절차(c) };
    // 스스로 끝났는데 줄이 모자라면 프로세스가 도중에 죽은 것이다 — 앞 케이스에 실패가 있어도 그 탓으로 돌리지 않는다. 뒤 케이스는 돌던 케이스에 막혔다
    if (i !== 돌던) return 자식.killedBy === null ? { ...빈, error: { message: BLOCKED }, blockedBy: cases[돌던]!.tcId } : { ...빈, error: { message: 자식.killedBy } };
    return { ...빈, durationMs: Math.max(0, 지금 - 돌던시작), startedAt: new Date(돌던시작).toISOString(), error: { message: 자식.killedBy ?? 오류글() } };
  });

  // 판정이 다 났고 그 판정으로는 테스트가 실패로 끝날 까닭이 없는데 프로세스가 실패로 끝났다 — 마지막 케이스 뒤에 둔 코드가 깨졌거나 정리 단계가 깨졌다.
  // 케이스가 틀린 것이 아니라 판정은 그대로 두고 사유만 맨 위에 싣는다 (2026-11-24 사용자)
  const 판정밖 = 자식.killedBy === null && 자식.code !== 0 && 돌던 === -1 && !results.some(실패로끝낼판정인가);
  return { ...머리, results, ...끊김, ...(판정밖 ? { error: { message: 오류글() } } : {}) };
}

/** 증적을 남길지 가르는 데만 쓴다 — 답에는 묶은 판정을 싣지 않는다. 통과가 아닌 케이스가 하나라도 있으면 남긴다 (공통/4-데이터모델 「테스트 프로시저 표」) */
export const 증적상태 = (답: ExecuteResponse | CasesExecuteResponse): ItemStatus =>
  'results' in 답 ? (답.results.every((r) => r.status === 'PASS') ? 'PASS' : 'FAIL') : 답.status;
