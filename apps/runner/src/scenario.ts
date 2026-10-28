// E2E 시나리오 1개를 Playwright 자식 프로세스 1개로 돌리고 부품 결과를 모아 돌려준다. 러너는 DB 를 모른다 (SPEC 도메인/러너 §5.2)
// 진행 알림과 중단 통로는 없다 — 둘 다 historyId 로 지목하는데 시나리오에는 그것이 없다. 그래서 running 지도에 안 올린다.
// 앱 · 게임 단계가 있으면 폰 연결 하나를 쥔다 — 그동안은 폰시나리오가도는가() 가 참이라 화면 읽기가 폰을 안 가로챈다 (SPEC 도메인/시나리오 §3.7 결정 16)

import { spawn } from 'node:child_process';
import { copyFile, mkdir, readdir, rename, unlink } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

import type { DeviceInfo, ScenarioCleanup, ScenarioExecuteRequest, ScenarioExecuteResponse, ScenarioPartResult } from '@platform/kit';
import { SCENARIO_CLEANUP_MARKER, SCENARIO_DEVICE_MARKER, SCENARIO_PART_MARKER } from '@platform/kit/scenario';

import { 판쓰기, 판지우기 } from './apiDoc.js';
import { 앱연결을닫는다 } from './appSession.js';
import { appRoot, gameEnv, tail } from './execute.js';
import { killTree } from './kill.js';
import { 산출물폴더, 출력폴더를지운다, 출력폴더이름 } from './outputDir.js';
import { 녹화폴더 } from './recordHar.js';

const scenarioConfig = resolve(appRoot, 'apps/runner/scenario/playwright.config.ts');

export const 폰단계가있나 = (req: Pick<ScenarioExecuteRequest, 'parts'>): boolean =>
  req.parts.some((p) => p.kind === 'case' && p.appStep === true);

// 실행 폴더 열쇠 — kit 의 PLATFORM_RUN_ID · PLATFORM_HISTORY_ID 와 같은 값이다. 연결 번호 파일 · 팜 증적이 이 폴더에 있다
export const 시나리오폴더 = (req: Pick<ScenarioExecuteRequest, 'runId' | 'trialId'>): [string, string] =>
  req.runId === null ? ['trial', req.trialId ?? ''] : [String(req.runId), 'scenario'];

// android 시나리오의 웹 단계 · 시작 빈 창은 PC 창으로 돈다. android project 에는 브라우저가 없다 (SPEC 도메인/시나리오 §3.7 결정 16)
export const 시나리오project = (req: Pick<ScenarioExecuteRequest, 'platform'>): string => (req.platform === 'android' ? 'desktop' : req.platform);

let 폰시나리오 = 0;
export const 폰시나리오가도는가 = (): boolean => 폰시나리오 > 0;

// 폰 연결 값 — 단독 앱 항목과 같은 이름이고 요청 값이 러너를 켤 때 준 값보다 앞선다. 앱 단계가 없으면 팜 토큰을 빼고 넘긴다(execute.ts 와 같은 까닭)
export function 폰환경(req: ScenarioExecuteRequest): Record<string, string | undefined> {
  // 넷 다 늘 적는다 — 러너를 켠 셸의 값을 자식이 물려받지 않게
  if (!폰단계가있나(req)) {
    return { PLATFORM_APPIUM_TOKEN: undefined, PLATFORM_APPIUM_NEW_COMMAND_TIMEOUT: '', PLATFORM_ENGINE: '', PLATFORM_GAME_LINK: '', PLATFORM_ADMIN_KEY: '' };
  }
  return {
    PLATFORM_APPIUM_TOKEN: process.env.PLATFORM_APPIUM_TOKEN,
    ...(req.app !== undefined && { PLATFORM_APP: req.app }),
    ...(req.udid !== undefined && { PLATFORM_DEVICE_UDID: req.udid }),
    // 웹 단계가 몇 개 끼어도 앱에 명령이 안 가는 동안 끊기지 않게 시나리오 제한 시간(초로 올림)으로 연다
    PLATFORM_APPIUM_NEW_COMMAND_TIMEOUT: String(Math.ceil(req.timeoutMs / 1000)),
    ...gameEnv({ ...req, platform: 'android' }),
  };
}

// 스크린샷 폴더를 kit 을 안 고치고 가른다 — 실제 실행 runs/<runId>/scenario/, 시험 실행 runs/trial/<trialId>/ (SPEC 도메인/러너 §5.2)
export function scenarioEnv(req: ScenarioExecuteRequest, parts: readonly unknown[] = req.parts): Record<string, string> {
  const 시험 = req.runId === null;
  // 창을 띄운 시험 실행만 사람이 눈으로 따라간다. 동작마다 1초 쉬게 한다 (SPEC 도메인/시나리오 §7 「시험 실행 규칙」)
  const 천천히 = 시험 && process.env.PLATFORM_HEADED === '1';
  return {
    // 늘 적는다 — 러너를 켠 셸에 이 값이 있으면 자식이 물려받아 진짜 실행까지 늦춘다
    PLATFORM_SLOW_MO: 천천히 ? '1000' : '',
    PLATFORM_SCENARIO_MODE: '1',
    PLATFORM_SCENARIO: JSON.stringify(parts),
    PLATFORM_BASE_URL: req.baseUrl,
    PLATFORM_DELETE_STATUSES: JSON.stringify(req.deleteStatuses ?? []),
    PLATFORM_RUN_ID: 시험 ? 'trial' : String(req.runId),
    PLATFORM_HISTORY_ID: 시험 ? (req.trialId ?? '') : 'scenario',
    // 실패한 부품의 네트워크 · 조작 · 콘솔을 admin 이 푼다. 시험 실행도 켠다 — 결과 화면이 같은 자리에 보인다 (도메인/시나리오 §7 「실패 기록」)
    PLATFORM_TRACE: '1',
    // 늘 적는다 — 러너를 켠 셸의 값이 시험 실행으로 번져 녹화되지 않게. 창을 여는 쪽(window.ts)이 이 폴더에 차례로 쓴다
    PLATFORM_RECORD_HAR_DIR: req.recordHar === undefined ? '' : 녹화폴더(req.recordHar.jobId),
  };
}

/** 사진 옆 자리 — admin 이 여기서 푼다. 실제 실행 runs/<runId>/scenario/, 시험 실행 runs/trial/<trialId>/ */
export function scenarioTraceDest(req: Pick<ScenarioExecuteRequest, 'runId' | 'trialId'>): string {
  return resolve(산출물폴더(), 'runs', ...시나리오폴더(req), 'trace.zip');
}

// 케이스는 kit 리포터가 옮기지만 시나리오 리포터는 kit 값을 못 불러온다(reporter.ts 머리). 테스트가 하나라 출력 폴더에 zip 도 하나다.
// 못 옮겨도 판정은 그대로다 — admin 이 「기록 없음」으로 보인다
export async function trace를옮긴다(출력: string, req: ScenarioExecuteRequest): Promise<void> {
  const 폴더 = resolve(산출물폴더(), 'playwright', 출력);
  const 이름 = (await readdir(폴더, { recursive: true }).catch(() => [] as string[])).find((n) => basename(n) === 'trace.zip');
  if (이름 === undefined) return;
  const 갈곳 = scenarioTraceDest(req);
  try {
    await mkdir(dirname(갈곳), { recursive: true });
    try {
      await rename(resolve(폴더, 이름), 갈곳);
    } catch (err) {
      // 출력 폴더와 runs 폴더가 다른 디스크면 옮기기가 안 된다. 그때만 복사한다
      if ((err as NodeJS.ErrnoException).code !== 'EXDEV') throw err;
      await copyFile(resolve(폴더, 이름), 갈곳);
      await unlink(resolve(폴더, 이름));
    }
  } catch (err) {
    console.warn(`[runner] 시나리오 trace 를 옮기지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * 부품 판 원문을 빼고 부품 줄에는 경로(apiDocFile)만 싣는다 — 시나리오는 한 프로세스라 환경값 한 칸으로 못 나누고
 * 판 원문은 그 칸에 안 든다 (SPEC 도메인/러너 §5.2 「API 케이스 실행」). 자리는 trace 옆이다.
 * 라우트가 이 꼴로 크기를 잰다 — 원문째 재면 큰 API 문서 하나로 400 이 난다 (2026-10-24 FIX-F2-05 · 리뷰 M15)
 */
export function 판뺀부품들(req: ScenarioExecuteRequest): { parts: unknown[]; 판들: { 경로: string; doc: unknown }[] } {
  const 폴더 = dirname(scenarioTraceDest(req));
  const 판들: { 경로: string; doc: unknown }[] = [];
  const parts = req.parts.map((part, i) => {
    if (part.kind !== 'case' || part.apiDoc === undefined) return part;
    const { apiDoc, ...나머지 } = part;
    const 경로 = resolve(폴더, `api-doc-${i + 1}.json`);
    판들.push({ 경로, doc: apiDoc.doc });
    return { ...나머지, apiDocFile: 경로 };
  });
  return { parts, 판들 };
}

export async function 판을파일로(req: ScenarioExecuteRequest): Promise<{ parts: unknown[]; 파일들: string[] }> {
  const { parts, 판들 } = 판뺀부품들(req);
  const 파일들: string[] = [];
  for (const 판 of 판들) 파일들.push(await 판쓰기(판.경로, 판.doc));
  return { parts, 파일들 };
}

// 줄 맨 앞의 표시자만 읽는다. kit 이 흘리는 진행 줄(@@PROGRESS@@)은 historyId 가 숫자가 아니라 여기서 버린다.
// 제한 시간에 죽이면 마지막 줄이 잘려 있을 수 있다 — 그 줄만 버리고 앞 부품은 살린다.
// **순번이 제 차례인 줄만 받는다.** 케이스 코드도 같은 stdout 에 쓴다 — 뒷 순번 줄을 찍으면 돌지 않은 부품이 PASS 로 보인다.
// 다음 순번은 새로 받고, 지금 순번은 갈아 끼운다(진짜 줄은 그 부품이 끝난 뒤에 온다). 실패 뒤는 버린다
export function parseParts(stdout: string): ScenarioPartResult[] {
  const parts: ScenarioPartResult[] = [];
  for (const line of stdout.split('\n')) {
    if (!line.startsWith(SCENARIO_PART_MARKER)) continue;
    let part: ScenarioPartResult;
    try {
      part = JSON.parse(line.slice(SCENARIO_PART_MARKER.length)) as ScenarioPartResult;
    } catch (err) {
      console.warn(`[runner] 시나리오 결과 줄을 버린다: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    const 마지막 = parts.at(-1);
    if (part.seq === parts.length && 마지막 !== undefined) parts[parts.length - 1] = part;
    else if (part.seq === parts.length + 1 && 마지막?.status !== 'FAIL') parts.push(part);
  }
  return parts;
}

// 고정 spec 이 시나리오 끝에 한 번 흘린다. 맨 앞 표시자 · 잘린 줄 규칙은 parseParts 와 같다
export function parseCleanup(stdout: string): ScenarioCleanup[] | undefined {
  let cleanup: ScenarioCleanup[] | undefined;
  for (const line of stdout.split('\n')) {
    if (!line.startsWith(SCENARIO_CLEANUP_MARKER)) continue;
    try {
      cleanup = JSON.parse(line.slice(SCENARIO_CLEANUP_MARKER.length)) as ScenarioCleanup[];
    } catch (err) {
      console.warn(`[runner] 시나리오 뒷정리 줄을 버린다: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return cleanup;
}

// 폰이 열리면 고정 spec 이 한 번 흘린다. 잘린 줄은 버린다 — 판정과 상관없는 머리 정보다
export function parseDevice(stdout: string): DeviceInfo | undefined {
  const 줄 = stdout.split('\n').find((l) => l.startsWith(SCENARIO_DEVICE_MARKER));
  if (줄 === undefined) return undefined;
  try {
    return JSON.parse(줄.slice(SCENARIO_DEVICE_MARKER.length)) as DeviceInfo;
  } catch (err) {
    console.warn(`[runner] 시나리오 기기 줄을 버린다: ${err instanceof Error ? err.message : String(err)}`);
    return undefined;
  }
}

const 빈부품 = (seq: number, message: string, status: ScenarioPartResult['status']): ScenarioPartResult => ({
  seq, status, durationMs: 0, steps: [], mocks: [], error: { message },
});

// 줄이 안 온 순번을 채운다. 러너가 채워야 자식이 죽어도 admin 이 「몇 번째에서 멈췄나」를 행으로 적는다.
// 오류 값의 정본은 SPEC 도메인/시나리오 §3.7 결정 9 — NOT_RUN 은 「앞 부품이 실패해 멈췄다」만 뜻한다
export function finishScenario(
  lines: ScenarioPartResult[],
  total: number,
  killed: boolean,
  durationMs: number,
  꼬리: string,
  cleanup?: ScenarioCleanup[],
): ScenarioExecuteResponse {
  const bySeq = new Map(lines.map((p) => [p.seq, p]));
  const parts: ScenarioPartResult[] = [];
  let 멈춤 = false;
  let 사유: string | undefined;

  for (let seq = 1; seq <= total; seq++) {
    const got = bySeq.get(seq);
    if (got !== undefined) {
      parts.push(got);
      if (got.status === 'FAIL') 멈춤 = true;
    } else if (멈춤) {
      parts.push(빈부품(seq, 'NOT_RUN', 'NA'));
    } else if (killed) {
      // 멈춘 원인이 앞 부품 실패가 아니라 제한 시간이다
      parts.push(빈부품(seq, 'TIMEOUT', 'NA'));
    } else {
      // 안 죽였는데 줄 없이 끝났다 — 설정 오류·자식 사망. 「안 돌았음」으로 두면 원인이 사라진다
      사유 = 꼬리 || '결과 줄 없이 끝났다';
      parts.push(빈부품(seq, 사유, 'FAIL'));
      멈춤 = true;
    }
  }

  if (killed) return { status: 'NA', durationMs, parts, error: { message: 'TIMEOUT' } };
  const status = parts.every((p) => p.status === 'PASS') ? 'PASS' : 'FAIL';
  return {
    status, durationMs, parts,
    ...(cleanup === undefined ? {} : { cleanup }),
    ...(사유 === undefined ? {} : { error: { message: 사유 } }),
  };
}

// parts 의 case 부품 filePath 는 라우트가 절대 경로로 풀어 넘긴다 — 자식의 작업 폴더가 다르다
export async function executeScenario(req: ScenarioExecuteRequest): Promise<ScenarioExecuteResponse> {
  const startedAt = Date.now();
  const 출력 = 출력폴더이름(req.runId ?? 'trial');
  const 판 = await 판을파일로(req);

  const 폰 = 폰단계가있나(req);
  if (폰) 폰시나리오++;

  const child = spawn(
    'npx',
    ['playwright', 'test', '--config', scenarioConfig, '--project', 시나리오project(req)],
    {
      cwd: appRoot,
      env: { ...process.env, ...폰환경(req), ...scenarioEnv(req, 판.parts), PLATFORM_OUTPUT_ID: 출력 },
      stdio: ['ignore', 'pipe', 'pipe'],
      // 제한 시간에 브라우저까지 한 번에 끊으려면 자식이 자기 프로세스 그룹의 장이어야 한다 (kill.ts)
      detached: true,
    },
  );

  // 조각마다 문자열로 바꾸면 3바이트 한글이 조각 경계에서 깨진다. 부품마다 긴 한글 줄을 흘려 잘 터진다
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk: string) => { stdout += chunk; });
  child.stderr.on('data', (chunk: string) => { stderr += chunk; });

  let killed = false;
  const timer = setTimeout(() => {
    killed = true;
    killTree(child);
  }, req.timeoutMs);

  // spawn 실패(프로세스를 못 띄움)는 러너 자체의 고장이므로 던져서 500으로 올린다
  const code = await new Promise<number | null>((done, fail) => {
    child.on('error', fail);
    child.on('close', done);
  }).finally(async () => {
    clearTimeout(timer);
    await 판지우기(판.파일들);
    // 죽였든 끝났든 kit 이 못 닫은 연결이 남아 있으면 닫는다 — 답하기 전에 끝내야 admin 이 폰을 놓을 때 팜 연결이 이미 풀려 있다 (execute.ts 와 같다)
    if (폰) {
      await 앱연결을닫는다(...시나리오폴더(req));
      폰시나리오--;
    }
  });
  await trace를옮긴다(출력, req);
  await 출력폴더를지운다(출력);

  // 부품 줄이 다 PASS 인데 자식이 0 아닌 코드로 끝났다 — 뒷정리에서 났다. 판정은 부품 줄이 정본이라 남기기만 한다
  if (!killed && code !== 0) console.warn(`[runner] 시나리오 자식이 ${String(code)} 로 끝났다: ${tail(stderr)}`);

  const 결과 = finishScenario(
    parseParts(stdout), req.parts.length, killed, Date.now() - startedAt, tail(stderr) || tail(stdout), parseCleanup(stdout),
  );
  const device = 폰 ? parseDevice(stdout) : undefined;
  return device === undefined ? 결과 : { ...결과, device };
}
