// 커스텀 리포터. 절차 결과를 모아 ExecuteResponse 한 줄로 stdout에 흘린다 (SPEC §5.2)
// 테스트가 끝날 때마다 바로 내보내고 아무것도 들고 있지 않는다. 러너는 이 줄만 읽는다

import { copyFileSync, mkdirSync, readFileSync, renameSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import type { Reporter, TestCase, TestError, TestResult } from '@playwright/test/reporter';

import type { ApiCallSeen, DeviceInfo, ElementCheck, ExecuteResponse, ItemStatus, StepResult } from '../types.js';

// 이 파일에는 값을 가져오는 상대 import를 두지 않는다. 러너 이미지의 Node 24는 './x.js'를 x.ts로
// 풀어주지 않아 리포터가 통째로 로드되지 않는다. 타입 import는 지워지므로 괜찮다.
// protocol.ts와 같은 값이어야 하며 reporter.test.ts가 그것을 지킨다
export const RESULT_MARKER = '@@RESULT@@';
export const STEP_ATTACHMENT = 'platform-step';
export const DEVICE_ATTACHMENT = 'platform-device';
export const GAME_ATTACHMENT = 'platform-game';
// 진행 표시자(PROGRESS_MARKER)는 **여기 두지 않는다.** onStdOut 이 거르지 않아 쓸 일이 없고,
// 상수가 서 있으면 「골라 쓰는 자리가 있나 보다」로 읽혀 아래 주석이 막으려는 실수를 유도한다

// artifacts.ts 의 runDir 과 같은 자리여야 한다 — 서버가 이 자리에서 푼다. 상대 import 를 못 써서 한 벌 더 두고
// reporter.test.ts 가 runDir 과 같은지 지킨다 (SPEC 도메인/러너 §5.2 「trace」)
export function traceDest(runId: string, historyId: string): string {
  const root = process.env.PLATFORM_ARTIFACTS_DIR ?? resolve(process.cwd(), 'artifacts');
  return resolve(root, 'runs', runId, historyId, 'trace.zip');
}

// 출력 폴더는 러너가 실행이 끝나면 지운다. 그 전에 스크린샷 옆으로 옮긴다.
// 테스트 실행(runId 0)은 실행 기록이 없어 둘 곳이 없다. 못 옮겨도 판정은 그대로 두고 사유만 알린다
export function moveTrace(result: TestResult): void {
  const runId = process.env.PLATFORM_RUN_ID;
  const historyId = process.env.PLATFORM_HISTORY_ID;
  if (runId === undefined || runId === '0' || historyId === undefined) return;
  const from = result.attachments.find((a) => a.name === 'trace')?.path;
  if (from === undefined) return;
  const to = traceDest(runId, historyId);
  try {
    mkdirSync(dirname(to), { recursive: true });
    try {
      renameSync(from, to);
    } catch (err) {
      // 출력 폴더와 runs 폴더가 다른 디스크면 옮기기가 안 된다. 그때만 복사한다
      if ((err as NodeJS.ErrnoException).code !== 'EXDEV') throw err;
      copyFileSync(from, to);
      unlinkSync(from);
    }
  } catch (err) {
    process.stderr.write(`[kit] trace 를 옮기지 못했다: ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

function collectSteps(result: TestResult): StepResult[] {
  const steps: StepResult[] = [];
  for (const attachment of result.attachments) {
    if (attachment.name !== STEP_ATTACHMENT) continue;
    const raw = attachmentText(attachment);
    if (raw === undefined) continue;
    steps.push(JSON.parse(raw) as StepResult);
  }
  return steps.sort((a, b) => a.seq - b.seq);
}

// 첨부는 본문으로 오기도 하고 파일로 떨어지기도 한다. 둘 다 받는다
function attachmentText(a: TestResult['attachments'][number]): string | undefined {
  return a.body?.toString() ?? (a.path === undefined ? undefined : readFileSync(a.path, 'utf8'));
}

// 앱 항목에서 연결이 열렸을 때만 있다 (APP-F1-05)
function deviceOf(result: TestResult): DeviceInfo | undefined {
  const a = result.attachments.find((x) => x.name === DEVICE_ATTACHMENT);
  const raw = a === undefined ? undefined : attachmentText(a);
  if (raw === undefined) return undefined;
  // 곁들이는 값이다 — 깨졌다고 결과 줄(절차 · 판정)까지 잃으면 안 된다
  try {
    return JSON.parse(raw) as DeviceInfo;
  } catch (err) {
    process.stderr.write(`[kit] 기기 정보를 읽지 못했다: ${err instanceof Error ? err.message : String(err)}\n`);
    return undefined;
  }
}

// 게임 항목만 — 데이터 대조 줄 · 부른 서버 API. 빈 목록은 칸을 안 싣는다 (공통/3-공유계약 「게임 테스트 타입」)
function gameOf(result: TestResult): Pick<ExecuteResponse, 'elementChecks' | 'apiCalls'> {
  const a = result.attachments.find((x) => x.name === GAME_ATTACHMENT);
  const raw = a === undefined ? undefined : attachmentText(a);
  if (raw === undefined) return {};
  // 곁들이는 값이다 — 깨졌다고 결과 줄(절차 · 판정)까지 잃으면 안 된다
  try {
    const v = JSON.parse(raw) as { elementChecks?: ElementCheck[]; apiCalls?: ApiCallSeen[] };
    return {
      ...(v.elementChecks?.length ? { elementChecks: v.elementChecks } : {}),
      ...(v.apiCalls?.length ? { apiCalls: v.apiCalls } : {}),
    };
  } catch (err) {
    process.stderr.write(`[kit] 게임 기록을 읽지 못했다: ${err instanceof Error ? err.message : String(err)}\n`);
    return {};
  }
}

function statusOf(result: TestResult, steps: StepResult[]): ItemStatus {
  // 판정할 근거가 없는 끝맺음은 전부 NA다. 실패와 구분돼야 러너 고장과 케이스 실패가 섞이지 않는다 (SPEC §3.2)
  if (result.status === 'timedOut' || result.status === 'interrupted' || result.status === 'skipped') return 'NA';
  if (result.status === 'failed' || steps.some((s) => s.status === 'FAIL')) return 'FAIL';
  return 'PASS';
}

// 건너뛴 이유는 실행 중에 붙는다. 선언하지 않은 환경으로 부른 경우가 여기로 온다
function skipReason(test: TestCase, result: TestResult): string | undefined {
  const annotations = [...result.annotations, ...test.annotations];
  return annotations.find((a) => a.type === 'skip')?.description;
}

function errorOf(
  result: TestResult,
  steps: StepResult[],
  status: ItemStatus,
  skipped: string | undefined,
): ExecuteResponse['error'] {
  if (status === 'NA') {
    return { message: result.error?.message ?? skipped ?? '판정 없이 실행이 끝났다' };
  }
  // 검증 문장으로 갈린 실패는 문장 자체가 사유다. error는 코드가 더 갈 수 없었던 경우에만 채운다
  const byException = steps.length === 0 || steps.some((s) => s.error !== undefined);
  if (status === 'FAIL' && byException && result.error !== undefined) {
    return {
      message: result.error.message ?? '알 수 없는 오류',
      ...(result.error.stack === undefined ? {} : { stack: result.error.stack }),
    };
  }
  return undefined;
}

class PlatformReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult): void {
    // 결과 줄보다 먼저 — 러너가 줄을 받고 서버가 항목을 닫으면 곧바로 이 파일을 찾는다
    moveTrace(result);
    const steps = collectSteps(result);
    const status = statusOf(result, steps);
    const error = errorOf(result, steps, status, skipReason(test, result));
    const device = deviceOf(result);

    const payload: ExecuteResponse = {
      historyId: Number(process.env.PLATFORM_HISTORY_ID ?? 0),
      status,
      durationMs: result.duration,
      steps,
      ...(error === undefined ? {} : { error }),
      ...(device === undefined ? {} : { device }),
      ...gameOf(result),
    };

    process.stdout.write(`${RESULT_MARKER}${JSON.stringify(payload)}\n`);
  }

  // 워커의 process.stdout.write는 Playwright가 IPC 전송으로 갈아치워 파이프에 한 글자도 안 닿는다.
  // 조각이 여기로 오므로 되돌려 써야 진행 줄이 러너에 닿는다.
  // 진행 줄만 골라 쓰면 안 된다 — 이 메서드가 생기는 순간 워커 stdio가 inherit에서 pipe로 바뀌어
  // 그냥 흘러가던 출력까지 전부 여기를 거친다. 버리면 러너가 오류 문장으로 쓰는 stdout 꼬리가 빈다
  onStdOut(chunk: string | Buffer): void {
    process.stdout.write(chunk);
  }

  // 케이스 파일을 못 읽은 오류(문법 오류 · import 실패)는 여기로만 온다. 버리면 stdout · stderr 가 둘 다 비어
  // 사유 없는 실패가 된다. 테스트가 안 돌아 결과 줄이 없으니 러너는 stderr 를 사유로 싣는다 (도메인/러너 §5.2)
  onError(error: TestError): void {
    const 문장 = error.message ?? error.stack ?? error.value;
    if (문장 !== undefined) process.stderr.write(`${문장}\n`);
  }

  printsToStdio(): boolean {
    return true;
  }
}

export default PlatformReporter;
