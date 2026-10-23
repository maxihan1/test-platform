// 케이스 1건을 자식 프로세스로 돌리고 결과를 구조화해 돌려준다. 러너는 DB를 모른다 (SPEC §3.4)
// 판정은 커스텀 리포터가 stdout에 뱉은 한 줄에서 온다. exit code는 그 줄이 없을 때의 대비책이다 (SPEC §5.2)

import { spawn, type ChildProcess } from 'node:child_process';
import { dirname, resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';

import type { ExecuteRequest, ExecuteResponse, ItemStatus, StepProgress } from '@platform/kit';

import { 판쓰기, 판지우기 } from './apiDoc.js';
import { 앱연결을닫는다 } from './appSession.js';
import { killTree } from './kill.js';
import { 산출물폴더, 출력폴더를지운다, 출력폴더이름 } from './outputDir.js';
import { 녹화폴더, 다음HAR경로 } from './recordHar.js';
import { createProgressCollector } from './progress.js';
import { parseResult, type RunnerResult } from './result.js';

// playwright.config.ts가 있는 곳. 여기서 자식 프로세스를 띄워야 projects 정의가 잡힌다
export const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const reporterPath = resolve(appRoot, 'packages/kit/src/runtime/reporter.ts');

export const testsDir = process.env.PLATFORM_TESTS_DIR ?? resolve(appRoot, 'tests');

// 왜 죽였는지. 판정은 둘 다 NA지만 사람이 보는 사유가 갈린다 (SPEC §5.2)
export type KilledBy = 'TIMEOUT' | 'ABORTED';

export interface Running {
  child: ChildProcess;
  // execute()의 지역 변수로 두면 abort()가 닿을 수 없다. 바깥에서 불리는 함수이기 때문이다
  killedBy: KilledBy | null;
  // 앱 화면 읽기가 폰을 쓰는 항목만 피하려고 둔다. 서버 러너는 브라우저 항목도 같이 돌린다 (러너 §5.2 「앱 화면 읽기」)
  platform?: ExecuteRequest['platform'];
  // 아직 절차를 알리지 않은 자식이 있으므로 선택 칸이다. 필수로 만들면 abort()가 읽는 같은 지도의
  // 기존 항목들이 전부 이 칸을 채워야 한다
  progress?: { step: StepProgress; 시작한때: number };
}

// 진행 줄이 올 때마다 마지막 것 하나로 갈아 끼운다. 쌓지 않는 이유는 화면이 묻는 것이
// '지금 무엇을 하는 중인가' 하나이기 때문이다. 시각이 아니라 시작한 때를 들고 있다가
// 물어보는 그 순간에 경과를 재야 받는 쪽 시계와의 차가 오차로 남지 않는다 (SPEC §5.2)
export function 진행을_모은다(entry: Running, stdout: Readable): void {
  const collector = createProgressCollector();
  stdout.on('data', (chunk: Buffer | string) => {
    for (const step of collector.push(chunk.toString())) {
      entry.progress = { step, 시작한때: Date.now() };
    }
  });
}

// historyId → 돌고 있는 자식. 메모리에만 산다. 러너가 죽으면 지도도 자식도 같이 사라지고,
// 남은 항목을 닫는 일은 admin의 재기동 복구가 맡는다 (SPEC §3.4)
export const running = new Map<number, Running>();

// 끊는 방식은 타임아웃과 완전히 같다. 바깥에서 부를 통로만 새로 낸 것이다 (SPEC §5.2)
export function abort(historyId: number): boolean {
  const entry = running.get(historyId);
  // 이미 끝났거나 모르는 historyId는 경합이지 고장이 아니다. 404로 만들면 admin이 정상 상황마다 에러를 받는다
  if (entry === undefined) return false;

  // 이미 죽인 것을 또 죽이라는 요청이다. 먼저 찍힌 사유가 이긴다 —
  // 제한 시간으로 죽은 것이 증적에 '사람이 끊음'으로 남으면 안 된다
  if (entry.killedBy !== null) return true;

  // 자식이 정상 종료했는데 close가 아직 안 온 창에서는 통과한 케이스가 중단으로 뒤집힌다.
  // 창이 밀리초라 러너에서 막지 않는다. 막는 자리는 admin의 닫는 UPDATE인데,
  // 지금 finished_at IS NULL 가드가 CLOSE_UNFINISHED에만 있고 finishItem에는 없다.
  // 그쪽은 WS-B 소유라 이번 범위에서 고치지 않았다 — 게이트 2 요약으로 넘겼다
  entry.killedBy = 'ABORTED';
  killTree(entry.child);
  return true;
}

export function statusFromExit(code: number | null, timedOut: boolean): ItemStatus {
  // 타임아웃은 통과도 실패도 아니다. 판정할 근거가 없으므로 NA다 (SPEC §5.2)
  if (timedOut) return 'NA';
  return code === 0 ? 'PASS' : 'FAIL';
}

// filePath는 admin이 HTTP로 넘긴 값이다. 테스트 루트 밖의 파일을 실행시키지 못하게 여기서 막는다
export function resolveSpecPath(root: string, filePath: string): string | null {
  const base = resolve(root);
  const full = resolve(base, filePath);
  if (!full.startsWith(base + sep)) return null;
  return full;
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

// 타임아웃으로 프로세스를 죽이면 결과 줄이 잘려 있을 수 있다. 그건 러너 고장이 아니라 중단의 흔적이다
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

// trace 는 정식 실행에서만 켠다. 테스트 실행(runId 0)은 기록이 없고, 앱 실행은 브라우저가 없다 (SPEC 도메인/실행 §3.2 「trace」)
export function traceEnv(req: Pick<ExecuteRequest, 'runId' | 'platform'>): '0' | '1' {
  return req.runId > 0 && req.platform !== 'android' ? '1' : '0';
}

export function gameEnv(req: Pick<ExecuteRequest, 'platform' | 'engine' | 'udid' | 'adminKey'>): Record<string, string> {
  const 게임 = req.platform === 'android' && req.engine === 'GAME';
  return {
    PLATFORM_ENGINE: 게임 ? 'GAME' : '',
    PLATFORM_GAME_LINK: 게임 ? (req.udid === undefined ? 'usb' : 'farm') : '',
    PLATFORM_ADMIN_KEY: req.adminKey === undefined ? '' : JSON.stringify(req.adminKey),
  };
}

export async function execute(req: ExecuteRequest, specPath: string): Promise<ExecuteResponse> {
  const startedAt = Date.now();
  const 출력 = 출력폴더이름(req.historyId);
  // 시험 실행은 runId · historyId 가 0 이라 나란히 돌면 겹친다 — 출력 이름(무작위가 붙는다)으로 가른다
  const 판파일 =
    req.apiDoc === undefined
      ? undefined
      : await 판쓰기(resolve(산출물폴더(), 'runs', String(req.runId), String(req.historyId), `api-doc-${출력}.json`), req.apiDoc.doc);

  const child = spawn(
    'npx',
    ['playwright', 'test', specPath, '--project', req.platform, `--reporter=${reporterPath}`],
    {
      cwd: appRoot,
      env: {
        ...process.env,
        PLATFORM_PARAMS: JSON.stringify({ params: req.params, expected: req.expected }),
        // 러너는 어떤 대상 서버가 있는지 모른다. 주소 하나만 받아 그대로 넘기고
        // playwright.config.ts가 use.baseURL로 받는다 (SPEC §5.2)
        PLATFORM_BASE_URL: req.baseUrl,
        // 스크린샷을 artifacts/runs/{runId}/{historyId}/ 아래에 쌓으려면 kit이 두 값을 알아야 한다 (SPEC §9)
        PLATFORM_RUN_ID: String(req.runId),
        PLATFORM_HISTORY_ID: String(req.historyId),
        // 상대 경로(runner:local 의 ./artifacts)면 러너와 자식(cwd: appRoot)이 서로 다른 폴더를 본다. 러너 cwd 기준으로 못 박아 넘긴다
        PLATFORM_ARTIFACTS_DIR: 산출물폴더(),
        PLATFORM_OUTPUT_ID: 출력,
        PLATFORM_TRACE: traceEnv(req),
        // 늘 적는다 — 러너를 켠 셸에 이 값이 있으면 자식이 물려받는다. 토큰은 kit 이 받는다 (도메인/러너 §5.2 「API 케이스 실행」)
        PLATFORM_API_AUTHS: JSON.stringify(req.apiAuths ?? []),
        // 인증과 같은 까닭으로 늘 적는다. 비면 kit 이 모양을 안 본다 (도메인/API §3.8 「응답 모양 확인」)
        PLATFORM_API_DOC_FILE: 판파일 ?? '',
        // 대상 서버마다 apk 가 다르다. 요청이 실으면 러너를 켤 때 준 값보다 앞선다 (러너 §5.2 「앱 실행」 · APP-F1-03)
        ...(req.platform === 'android' && req.app !== undefined && { PLATFORM_APP: req.app }),
        // admin 이 팜에서 잡은 폰이다. 안 주면 팜이 잡힌 폰 아무것에나 붙인다 (러너 §5.2 「디바이스 팜 접속 방식」)
        ...(req.platform === 'android' && req.udid !== undefined && { PLATFORM_DEVICE_UDID: req.udid }),
        // 셋 다 늘 적는다 — 러너를 켠 셸의 값을 자식이 물려받지 않게. 게임에 닿는 길은 칸을 더하지 않고 폰 번호로 정한다:
        // admin 이 팜 폰을 잡아 번호를 실은 정식 실행은 디바이스 팜, 번호 없는 내 컴퓨터 테스트 실행은 USB (공통/3-공유계약 「게임 테스트 타입」 engine)
        ...gameEnv(req),
        // 성능 녹화 — 설정 파일이 이 경로로 HAR 를 남긴다. 늘 적는다 — 러너를 켠 셸에 값이 있으면 자식이 물려받아 모든 실행을 녹화한다
        PLATFORM_RECORD_HAR: req.recordHar === undefined ? '' : 다음HAR경로(녹화폴더(req.recordHar.jobId)),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      // 타임아웃 때 브라우저까지 한 번에 끊으려면 자식이 자기 프로세스 그룹의 장이어야 한다 (kill.ts)
      detached: true,
    },
  );

  // 바깥에서 abort()가 찾을 수 있게 지도에 올린다. 사유를 지역 변수로 두면 그 함수가 닿지 못한다
  const entry: Running = { child, killedBy: null, platform: req.platform };
  running.set(req.historyId, entry);

  // 조각마다 따로 풀면 경계에 걸린 한글 한 글자가 � 둘이 된다. 결과 줄의 절차 제목 · 검증 문장도 같은 길로 온다 (scenario.ts 와 같다)
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  진행을_모은다(entry, child.stdout);

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk: string) => { stdout += chunk; });
  child.stderr.on('data', (chunk: string) => { stderr += chunk; });

  const timer = setTimeout(() => {
    entry.killedBy = 'TIMEOUT';
    killTree(child);
  }, req.timeoutMs);

  // spawn 실패(프로세스를 못 띄움)는 러너 자체의 고장이므로 던져서 500으로 올린다
  const code = await new Promise<number | null>((done, fail) => {
    child.on('error', fail);
    child.on('close', done);
  }).finally(async () => {
    clearTimeout(timer);
    running.delete(req.historyId);
    if (판파일 !== undefined) await 판지우기([판파일]);
  });
  await 출력폴더를지운다(출력);

  // killedBy 와 상관없이 닫는다 — 정상 종료라도 kit 의 닫기가 실패했으면 번호 파일이 남는다.
  // 답하기 전에 끝내야 admin 이 답을 받았을 때 팜의 디바이스가 이미 풀려 있다
  if (req.platform === 'android') await 앱연결을닫는다(req.runId, req.historyId);

  if (entry.killedBy !== null) {
    return killedResponse(req.historyId, entry.killedBy, Date.now() - startedAt, stdout);
  }

  const parsed = parseResult(stdout);
  if (parsed !== null) {
    return {
      historyId: req.historyId,
      status: parsed.status,
      durationMs: parsed.durationMs,
      steps: parsed.steps,
      ...(parsed.error === undefined ? {} : { error: parsed.error }),
      // 앱 항목의 폰 · 앱 판. 증적 머리에 싣는다 (도메인/리포팅 §8.4 · APP-F1-05)
      ...(parsed.device === undefined ? {} : { device: parsed.device }),
      // 게임 항목만 — admin 이 게임 지도 · 서비스 지도에 쓴다 (공통/3-공유계약 「게임 테스트 타입」)
      ...(parsed.elementChecks === undefined ? {} : { elementChecks: parsed.elementChecks }),
      ...(parsed.apiCalls === undefined ? {} : { apiCalls: parsed.apiCalls }),
    };
  }

  // 리포터가 결과를 못 뱉었다 = 케이스가 아예 안 돌았다(문법 오류·import 실패 등). exit code로만 판정한다
  const status = statusFromExit(code, false);
  return {
    historyId: req.historyId,
    status,
    durationMs: Date.now() - startedAt,
    steps: [],
    ...(status === 'PASS' ? {} : { error: { message: tail(stderr) || tail(stdout) } }),
  };
}
