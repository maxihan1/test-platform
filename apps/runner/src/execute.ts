// 파일 하나를 자식 프로세스로 돌리고 결과를 구조화해 돌려준다. 러너는 DB를 모른다 (SPEC §3.4)
// 판정은 자식이 stdout에 뱉은 줄에서 온다 — 앞 꼴은 리포터의 결과 한 줄, 새 꼴은 kit 이 케이스마다 흘린 판정 줄이다. 답을 만드는 일은 response.ts 가 한다 (SPEC §5.2)

import { spawn, type ChildProcess } from 'node:child_process';
import { dirname, join, resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

import { runDir, type CasesExecuteRequest, type CasesExecuteResponse, type ExecuteRequest, type ExecuteResponse, type FpsSample, type StepProgress } from '@platform/kit';

import { 판쓰기, 판지우기 } from './apiDoc.js';
import { 앱연결을닫는다 } from './appSession.js';
import { FPS를잰다 } from './gameFps.js';
import { gameEnv, traceEnv, 기기항목인가 } from './itemEnv.js';
import { killTree } from './kill.js';
import { 장면환경 } from './live.js';
import { 산출물폴더, 출력폴더를지운다, 출력폴더이름 } from './outputDir.js';
import { 녹화폴더, 다음HAR경로 } from './recordHar.js';
import { createProgressCollector } from './progress.js';
import { 실제폰인가, 실제폰환경, 폰기기를묻는다, 폰로그, 폰로그를받는다, 폰증적을둔다 } from './realPhone.js';
import { 앞꼴응답, 증적상태, 케이스응답, type KilledBy } from './response.js';
import { kit경고 } from './result.js';

export { killedResponse, statusFromExit, tail, type KilledBy } from './response.js';

// playwright.config.ts가 있는 곳. 여기서 자식 프로세스를 띄워야 projects 정의가 잡힌다
export const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const reporterPath = resolve(appRoot, 'packages/kit/src/runtime/reporter.ts');

export const testsDir = process.env.PLATFORM_TESTS_DIR ?? resolve(appRoot, 'tests');

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

// filePath는 admin이 HTTP로 넘긴 값이다. 테스트 루트 밖의 파일을 실행시키지 못하게 여기서 막는다
export function resolveSpecPath(root: string, filePath: string): string | null {
  const base = resolve(root);
  const full = resolve(base, filePath);
  if (!full.startsWith(base + sep)) return null;
  return full;
}

export { gameEnv, traceEnv };

// 요청에 케이스 목록(cases)이 있으면 새 꼴로, 없으면 앞 꼴로 답한다. 앞 꼴은 TP-F6-32 에 걷는다 (SPEC 도메인/러너 §5.2 「프로시저 실행」)
export function execute(req: ExecuteRequest, specPath: string): Promise<ExecuteResponse>;
export function execute(req: CasesExecuteRequest, specPath: string): Promise<CasesExecuteResponse>;
export function execute(req: ExecuteRequest | CasesExecuteRequest, specPath: string): Promise<ExecuteResponse | CasesExecuteResponse>;
export async function execute(req: ExecuteRequest | CasesExecuteRequest, specPath: string): Promise<ExecuteResponse | CasesExecuteResponse> {
  const startedAt = Date.now();
  const 케이스들 = 'cases' in req ? req.cases : undefined;
  // 옛 꼴 파일은 케이스가 하나다 — 그 값을 지금 길(PLATFORM_PARAMS)로 읽는다
  const 첫 = 'cases' in req ? req.cases[0]! : req;
  const 출력 = 출력폴더이름(req.historyId);
  // 시험 실행은 runId · historyId 가 0 이라 나란히 돌면 겹친다 — 출력 이름(무작위가 붙는다)으로 가른다
  const 판파일 =
    req.apiDoc === undefined
      ? undefined
      : await 판쓰기(resolve(산출물폴더(), 'runs', String(req.runId), String(req.historyId), `api-doc-${출력}.json`), req.apiDoc.doc);
  // 실제 폰 Chrome 항목 — 통과 못 한 정식 실행 항목에 남길 폰 영상 · logcat 을 도는 내내 받는다 (SPEC 도메인/러너 §5.2 「모바일 웹 — 실제 폰 Chrome」)
  const 폰 = 실제폰인가(req) ? req : undefined;
  const 폰폴더 = runDir(String(req.runId), String(req.historyId));
  const 폰증적 = 폰 !== undefined && req.runId > 0;
  const 로그끝 = 폰 !== undefined && 폰증적 ? 폰로그를받는다(폰, join(폰폴더, 폰로그)) : undefined;
  const 폰기기 = 폰 === undefined ? undefined : 폰기기를묻는다(폰);

  const child = spawn(
    'npx',
    ['playwright', 'test', specPath, '--project', req.platform, `--reporter=${reporterPath}`],
    {
      cwd: appRoot,
      env: {
        ...process.env,
        PLATFORM_PARAMS: JSON.stringify({ params: 첫.params, expected: 첫.expected }),
        // 프로시저 파일은 케이스마다 자기 값을 여기서 꺼낸다. 늘 적는다 — 러너를 켠 셸의 값을 물려받지 않게 (도메인/러너 §5.2 「프로시저 실행」 「케이스별 입력」)
        // ponytail: 환경값 한 칸은 128KiB 까지다 — 케이스 10개의 값으로는 못 닿는다. 닿으면 자식을 못 띄워 500 이 되고, 그때 파일로 넘긴다(API 문서 판처럼)
        PLATFORM_CASES: 케이스들 === undefined ? '' : JSON.stringify(케이스들),
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
        // 늘 적는다 — 러너를 켠 셸의 값을 물려받으면 앞 빌드가 없는 실행에서 옛판에서올리기 가 엉뚱한 판을 깐다. undefined 는 spawn 이 뺀다
        PLATFORM_APP_PREVIOUS: req.platform === 'android' ? req.previousApp : undefined,
        // admin 이 팜에서 잡은 폰이다. 안 주면 팜이 잡힌 폰 아무것에나 붙인다 (러너 §5.2 「디바이스 팜 접속 방식」)
        ...(기기항목인가(req.platform) && req.udid !== undefined && { PLATFORM_DEVICE_UDID: req.udid }),
        // 팜 토큰은 앱 · 게임 항목만 받는다 — 웹 · API 케이스(AI 가 쓴 코드)는 쓸 일이 없는데 읽을 수는 있다. undefined 는 spawn 이 빼고 넘긴다.
        // admin 이 누른 사람 토큰으로 폰을 잡았으면 그것이다 — 잡은 사람과 붙는 사람이 다르면 팜이 거절한다 (러너 §5.2 「팜 토큰은 누른 사람 것이 먼저다」)
        PLATFORM_APPIUM_TOKEN: 기기항목인가(req.platform) ? (req.farmToken ?? process.env.PLATFORM_APPIUM_TOKEN) : undefined,
        // 셋 다 늘 적는다 — 러너를 켠 셸의 값을 자식이 물려받지 않게. 게임에 닿는 길은 칸을 더하지 않고 폰 번호로 정한다:
        // admin 이 팜 폰을 잡아 번호를 실은 정식 실행은 디바이스 팜, 번호 없는 내 컴퓨터 테스트 실행은 USB (공통/3-공유계약 「게임 테스트 타입」 engine)
        ...gameEnv(req),
        // 시나리오만 쓰는 값이다 — 러너를 켠 셸에 남은 값이 단독 항목의 연결 유지 시간을 바꾸지 않게 늘 비운다
        PLATFORM_APPIUM_NEW_COMMAND_TIMEOUT: '',
        // 호환성 정식 실행의 앱 · 게임 항목만 팜 AI 점검을 켠다 — 테스트 실행(runId 0)은 결과를 안 받아 비전 사용량만 쓴다.
        // 늘 적는다 — 러너를 켠 셸의 값을 물려받아 모든 항목이 찍히지 않게 (도메인/호환성 §7 「러너 · kit」)
        PLATFORM_UI_CHECK: req.platform === 'android' && req.uiCheck === true && req.runId > 0 ? '1' : '',
        // 정기 실행의 앱 · 게임 항목 — kit 이 통과해도 게임 오류 파일을 남긴다. 늘 적는다 — 셸의 값을 물려받지 않게 (도메인/안정화 §7 kit 블록)
        PLATFORM_STABILITY: req.platform === 'android' && req.stability === true ? '1' : '',
        // 성능 녹화 — 설정 파일이 이 경로로 HAR 를 남긴다. 늘 적는다 — 러너를 켠 셸에 값이 있으면 자식이 물려받아 모든 실행을 녹화한다
        PLATFORM_RECORD_HAR: req.recordHar === undefined ? '' : 다음HAR경로(녹화폴더(req.recordHar.jobId)),
        // 열쇠가 오면 page 의 장면을 이 파일에 쓴다. 동작마다 1초 쉬는 것은 테스트 실행(runId 0)뿐이다 (도메인/러너 §5.2 「테스트 모드 — 실시간 장면」)
        ...장면환경(req.live, req.runId === 0),
        // 위의 팜 토큰 · 장면 파일보다 뒤에 둔다 — 실제 폰은 그 둘을 바꾼다
        ...실제폰환경(req, 폰폴더, 폰증적),
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
  // 게임 정식 실행 항목만 — 테스트 실행(runId 0)은 기록이 안 남는다 (러너 §5.2 「게임 항목 FPS」)
  // 윈도우 PC 항목은 FPS 를 안 잰다 — 1차 밖이다 (도메인/게임 §3.10 「1차 밖 · 나중」)
  const 측정 = req.runId > 0 && req.platform === 'android' && gameEnv(req).PLATFORM_ENGINE === 'GAME' ? FPS를잰다(req.runId, req.historyId, req.farmToken, () => entry.progress?.step.seq) : undefined;

  let stdout = '';
  let stderr = '';
  let fps: FpsSample[] = [];
  child.stdout.on('data', (chunk: string) => { stdout += chunk; });
  child.stderr.on('data', (chunk: string) => { stderr += chunk; });

  // 0 은 한도 없음(게임 시나리오) — 미션 멈춤은 kit 이 잡고 사람이 멈추는 것은 abort 가 한다 (도메인/게임 §3.10 결정 21)
  const timer =
    req.timeoutMs === 0
      ? undefined
      : setTimeout(() => {
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
    fps = (await 측정?.멈춘다()) ?? [];
    if (판파일 !== undefined) await 판지우기([판파일]);
    await 로그끝?.();
  });
  await 출력폴더를지운다(출력);
  // 러너 기록에 옮겨 적는다 — 자식 출력은 응답 사유로만 쓰여 서버 기록에서 안 보였다
  for (const 줄 of kit경고(stderr)) console.warn(`[runner] ${('cases' in req ? req.procId : undefined) ?? 첫.tcId} #${String(req.historyId)} ${줄}`);

  // killedBy 와 상관없이 닫는다 — 정상 종료라도 kit 의 닫기가 실패했으면 번호 파일이 남는다.
  // 답하기 전에 끝내야 admin 이 답을 받았을 때 팜의 디바이스가 이미 풀려 있다
  if (req.platform === 'android') await 앱연결을닫는다(req.runId, req.historyId, req.farmToken);

  // 하나도 못 읽었으면 칸을 안 싣는다 — 화면이 빈 선을 그리지 않는다
  const fps칸 = fps.some((f) => f.fps !== null) ? { fps } : {};

  const 자식 = { killedBy: entry.killedBy, code, startedAt, stdout, stderr };
  const 응답 = 케이스들 === undefined ? 앞꼴응답(req.historyId, 자식, fps칸) : 케이스응답(req.historyId, 케이스들, 자식, fps칸);
  if (폰기기 === undefined) return 응답;
  if (폰증적) await 폰증적을둔다(폰폴더, 증적상태(응답));
  return { ...응답, device: await 폰기기(응답.device) };
}
