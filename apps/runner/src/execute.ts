// 케이스 1건을 자식 프로세스로 돌리고 결과를 구조화해 돌려준다. 러너는 DB를 모른다 (SPEC §3.4)
// 판정은 커스텀 리포터가 stdout에 뱉은 한 줄에서 온다. exit code는 그 줄이 없을 때의 대비책이다 (SPEC §5.2)

import { spawn, type ChildProcess } from 'node:child_process';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ExecuteRequest, ExecuteResponse, ItemStatus } from '@platform/kit';

import { killTree } from './kill.js';
import { parseResult, type RunnerResult } from './result.js';

// playwright.config.ts가 있는 곳. 여기서 자식 프로세스를 띄워야 projects 정의가 잡힌다
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const reporterPath = resolve(appRoot, 'packages/kit/src/runtime/reporter.ts');

export const testsDir = process.env.PLATFORM_TESTS_DIR ?? resolve(appRoot, 'tests');

// 왜 죽였는지. 판정은 둘 다 NA지만 사람이 보는 사유가 갈린다 (SPEC §5.2)
export type KilledBy = 'TIMEOUT' | 'ABORTED';

export interface Running {
  child: ChildProcess;
  // execute()의 지역 변수로 두면 abort()가 닿을 수 없다. 바깥에서 불리는 함수이기 때문이다
  killedBy: KilledBy | null;
}

// historyId → 돌고 있는 자식. 메모리에만 산다. 러너가 죽으면 지도도 자식도 같이 사라지고,
// 남은 항목을 닫는 일은 admin의 재기동 복구가 맡는다 (SPEC §3.4)
export const running = new Map<number, Running>();

// 끊는 방식은 타임아웃과 완전히 같다. 바깥에서 부를 통로만 새로 낸 것이다 (SPEC §5.2)
export function abort(historyId: number): boolean {
  const entry = running.get(historyId);
  // 이미 끝났거나 모르는 historyId는 경합이지 고장이 아니다. 404로 만들면 admin이 정상 상황마다 에러를 받는다
  if (entry === undefined) return false;

  // 자식이 이미 끝났는데 close가 아직 안 온 창에서는 통과한 케이스가 중단으로 뒤집힌다.
  // 여기서 이기려 하지 않는다 — 창이 밀리초이고, admin이 닫는 UPDATE마다 finished_at IS NULL을
  // 붙여 이미 막고 있다 (apps/admin/src/execution/store.ts). 먼저 닫힌 쪽이 이긴다
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

function tail(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > 2000 ? trimmed.slice(-2000) : trimmed;
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

export async function execute(req: ExecuteRequest, specPath: string): Promise<ExecuteResponse> {
  const startedAt = Date.now();

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
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      // 타임아웃 때 브라우저까지 한 번에 끊으려면 자식이 자기 프로세스 그룹의 장이어야 한다 (kill.ts)
      detached: true,
    },
  );

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    killTree(child);
  }, req.timeoutMs);

  // spawn 실패(프로세스를 못 띄움)는 러너 자체의 고장이므로 던져서 500으로 올린다
  const code = await new Promise<number | null>((done, fail) => {
    child.on('error', fail);
    child.on('close', done);
  }).finally(() => clearTimeout(timer));

  if (timedOut) {
    // 부분 결과라도 있으면 그대로 넘긴다. 어디까지 갔는지가 사람에게는 정보다 (SPEC §5.2)
    return {
      historyId: req.historyId,
      status: 'NA',
      durationMs: Date.now() - startedAt,
      steps: parseAfterKill(stdout)?.steps ?? [],
      error: { message: 'TIMEOUT' },
    };
  }

  const parsed = parseResult(stdout);
  if (parsed !== null) {
    return {
      historyId: req.historyId,
      status: parsed.status,
      durationMs: parsed.durationMs,
      steps: parsed.steps,
      ...(parsed.error === undefined ? {} : { error: parsed.error }),
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
