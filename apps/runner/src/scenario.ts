// E2E 시나리오 1개를 Playwright 자식 프로세스 1개로 돌리고 부품 결과를 모아 돌려준다. 러너는 DB 를 모른다 (SPEC 도메인/러너 §5.2)
// 진행 알림과 중단은 케이스의 running 지도(historyId 열쇠)와 따로 runId · trialId 열쇠의 지도로 한다 (SPEC 도메인/러너 §5.2 「시나리오 진행 · 중단」)
// 앱 · 게임 단계가 있으면 폰 연결 하나를 쥔다 — 그동안은 폰시나리오가도는가() 가 참이라 화면 읽기가 폰을 안 가로챈다 (SPEC 도메인/시나리오 §3.7 결정 16)

import { spawn } from 'node:child_process';
import { copyFile, mkdir, readdir, rename, unlink } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

import { runDir, type ScenarioCleanup, type ScenarioExecuteRequest, type ScenarioExecuteResponse, type ScenarioPartResult } from '@platform/kit';
import { SCENARIO_PART_MARKER } from '@platform/kit/scenario';

import { 판쓰기, 판지우기 } from './apiDoc.js';
import { 앱연결을닫는다 } from './appSession.js';
import { appRoot, gameEnv, tail, type KilledBy } from './execute.js';
import { killTree } from './kill.js';
import { 장면환경 } from './live.js';
import { 산출물폴더, 출력폴더를지운다, 출력폴더이름 } from './outputDir.js';
import { 실제폰인가, 실제폰환경, 폰기기를묻는다, 폰로그, 폰로그를받는다, 폰증적을둔다 } from './realPhone.js';
import { 녹화폴더 } from './recordHar.js';
import { parseCleanup, parseDevice, parseParts } from './scenarioLines.js';
import { runningScenarios, 열쇠, type 도는시나리오 } from './scenarioRunning.js';

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
  // 다섯 다 늘 적는다 — 러너를 켠 셸의 값을 자식이 물려받지 않게
  if (!폰단계가있나(req)) {
    return { PLATFORM_APPIUM_TOKEN: undefined, PLATFORM_APPIUM_NEW_COMMAND_TIMEOUT: '', PLATFORM_ENGINE: '', PLATFORM_GAME_LINK: '', PLATFORM_ADMIN_KEY: '' };
  }
  return {
    PLATFORM_APPIUM_TOKEN: req.farmToken ?? process.env.PLATFORM_APPIUM_TOKEN,
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
  return {
    // 장면 열쇠가 오면 첫 탭의 장면을 쓴다. 동작마다 1초 쉬는 것은 시험 실행(테스트 모드)만이다. 창이 뜨는지는 안 본다 (SPEC 도메인/러너 §5.2 「테스트 모드 — 실시간 장면」)
    ...장면환경(req.live, 시험),
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

export { parseCleanup, parseDevice, parseParts } from './scenarioLines.js';

const 빈부품 = (seq: number, message: string, status: ScenarioPartResult['status']): ScenarioPartResult => ({
  seq, status, durationMs: 0, steps: [], mocks: [], error: { message },
});

// 줄이 안 온 순번을 채운다. 러너가 채워야 자식이 죽어도 admin 이 「몇 번째에서 멈췄나」를 행으로 적는다.
// 오류 값의 정본은 SPEC 도메인/시나리오 §3.7 결정 9 — NOT_RUN 은 「앞 부품이 실패해 멈췄다」만 뜻한다
export function finishScenario(
  lines: ScenarioPartResult[],
  total: number,
  killed: KilledBy | null,
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
    } else if (killed !== null) {
      // 멈춘 원인이 앞 부품 실패가 아니라 제한 시간이거나 사람이 끊은 것이다
      parts.push(빈부품(seq, killed, 'NA'));
    } else {
      // 안 죽였는데 줄 없이 끝났다 — 설정 오류·자식 사망. 「안 돌았음」으로 두면 원인이 사라진다
      사유 = 꼬리 || '결과 줄 없이 끝났다';
      parts.push(빈부품(seq, 사유, 'FAIL'));
      멈춤 = true;
    }
  }

  if (killed !== null) return { status: 'NA', durationMs, parts, error: { message: killed } };
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
  // 실제 폰 모바일 시나리오 — 앱 · 게임 단계와 같이 못 온다(입구가 막는다). 증적은 통과 못 한 정식 실행에 한 벌이다 (SPEC 도메인/러너 §5.2 「모바일 웹 — 실제 폰 Chrome」)
  const 실제폰 = 실제폰인가(req) ? req : undefined;
  const 폰폴더 = runDir(...시나리오폴더(req));
  const 폰증적 = 실제폰 !== undefined && req.runId !== null;
  const 로그끝 = 실제폰 !== undefined && 폰증적 ? 폰로그를받는다(실제폰, join(폰폴더, 폰로그)) : undefined;
  const 폰기기 = 실제폰 === undefined ? undefined : 폰기기를묻는다(실제폰);

  const child = spawn(
    'npx',
    ['playwright', 'test', '--config', scenarioConfig, '--project', 시나리오project(req)],
    {
      cwd: appRoot,
      env: { ...process.env, ...폰환경(req), ...scenarioEnv(req, 판.parts), ...실제폰환경(req, 폰폴더, 폰증적), PLATFORM_OUTPUT_ID: 출력 },
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
  const entry: 도는시나리오 = {
    child, killedBy: null, runId: req.runId, trialId: req.trialId, total: req.parts.length, 받은줄수: 0, 부품시작: startedAt,
  };
  const key = 열쇠(req);
  runningScenarios.set(key, entry);
  let 읽은끝 = 0;
  child.stdout.on('data', (chunk: string) => {
    stdout += chunk;
    // 끝까지 온 줄만 센다 — 잘린 줄을 읽으면 JSON 경고가 청크마다 난다
    const 끝 = stdout.lastIndexOf('\n') + 1;
    const 새줄 = stdout.slice(읽은끝, 끝);
    읽은끝 = 끝;
    if (!새줄.includes(SCENARIO_PART_MARKER)) return;
    const 수 = parseParts(stdout.slice(0, 끝)).length;
    if (수 !== entry.받은줄수) {
      entry.받은줄수 = 수;
      entry.부품시작 = Date.now();
    }
  });
  child.stderr.on('data', (chunk: string) => { stderr += chunk; });

  const timer = setTimeout(() => {
    // 사람이 먼저 끊었으면 그 사유가 이긴다
    entry.killedBy ??= 'TIMEOUT';
    killTree(child);
  }, req.timeoutMs);

  // spawn 실패(프로세스를 못 띄움)는 러너 자체의 고장이므로 던져서 500으로 올린다
  const code = await new Promise<number | null>((done, fail) => {
    child.on('error', fail);
    child.on('close', done);
  }).finally(async () => {
    clearTimeout(timer);
    if (runningScenarios.get(key) === entry) runningScenarios.delete(key);
    await 판지우기(판.파일들);
    await 로그끝?.();
    // 죽였든 끝났든 kit 이 못 닫은 연결이 남아 있으면 닫는다 — 답하기 전에 끝내야 admin 이 폰을 놓을 때 팜 연결이 이미 풀려 있다 (execute.ts 와 같다)
    if (폰) {
      await 앱연결을닫는다(...시나리오폴더(req), req.farmToken);
      폰시나리오--;
    }
  });
  await trace를옮긴다(출력, req);
  await 출력폴더를지운다(출력);

  // 부품 줄이 다 PASS 인데 자식이 0 아닌 코드로 끝났다 — 뒷정리에서 났다. 판정은 부품 줄이 정본이라 남기기만 한다
  if (entry.killedBy === null && code !== 0) console.warn(`[runner] 시나리오 자식이 ${String(code)} 로 끝났다: ${tail(stderr)}`);

  const 결과 = finishScenario(
    parseParts(stdout), req.parts.length, entry.killedBy, Date.now() - startedAt, tail(stderr) || tail(stdout), parseCleanup(stdout),
  );
  if (폰기기 !== undefined) {
    if (폰증적) await 폰증적을둔다(폰폴더, 결과.status);
    return { ...결과, device: await 폰기기(parseDevice(stdout)) };
  }
  const device = 폰 ? parseDevice(stdout) : undefined;
  return device === undefined ? 결과 : { ...결과, device };
}
