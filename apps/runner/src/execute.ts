// 케이스 1건을 자식 프로세스로 돌리고 결과를 구조화해 돌려준다. 러너는 DB를 모른다 (SPEC §3.4)
// Phase 0는 리포터 없이 exit code만으로 판정한다. StepResult 조립은 WS-C가 채운다

import { spawn } from 'node:child_process';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ExecuteRequest, ExecuteResponse, ItemStatus } from '@platform/kit';

// playwright.config.ts가 있는 곳. 여기서 자식 프로세스를 띄워야 projects 정의가 잡힌다
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

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

export async function execute(req: ExecuteRequest, specPath: string): Promise<ExecuteResponse> {
  const startedAt = Date.now();

  const child = spawn('npx', ['playwright', 'test', specPath, '--project', req.platform], {
    cwd: appRoot,
    env: {
      ...process.env,
      PLATFORM_PARAMS: JSON.stringify({ params: req.params, expected: req.expected }),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill('SIGKILL');
  }, req.timeoutMs);

  // spawn 실패(프로세스를 못 띄움)는 러너 자체의 고장이므로 던져서 500으로 올린다
  const code = await new Promise<number | null>((done, fail) => {
    child.on('error', fail);
    child.on('close', done);
  }).finally(() => clearTimeout(timer));

  const status = statusFromExit(code, timedOut);

  return {
    historyId: req.historyId,
    status,
    durationMs: Date.now() - startedAt,
    steps: [],
    ...(timedOut ? { error: { message: 'TIMEOUT' } } : {}),
    ...(status === 'FAIL' ? { error: { message: tail(stderr) || tail(stdout) } } : {}),
  };
}
