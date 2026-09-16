// 케이스 1건을 자식 프로세스로 돌리고 결과를 구조화해 돌려준다. 러너는 DB를 모른다 (SPEC §3.4)
// 판정은 커스텀 리포터가 stdout에 뱉은 한 줄에서 온다. exit code는 그 줄이 없을 때의 대비책이다 (SPEC §5.2)

import { spawn } from 'node:child_process';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ExecuteRequest, ExecuteResponse, ItemStatus } from '@platform/kit';

import { killTree } from './kill.js';
import { parseResult, type RunnerResult } from './result.js';

// playwright.config.ts가 있는 곳. 여기서 자식 프로세스를 띄워야 projects 정의가 잡힌다
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const reporterPath = resolve(appRoot, 'packages/kit/src/runtime/reporter.ts');

export const testsDir = process.env.PLATFORM_TESTS_DIR ?? resolve(appRoot, 'tests');

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
