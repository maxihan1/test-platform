// 커스텀 리포터. 절차 결과를 모아 ExecuteResponse 한 줄로 stdout에 흘린다 (SPEC §5.2)
// 테스트가 끝날 때마다 바로 내보내고 아무것도 들고 있지 않는다. 러너는 이 줄만 읽는다

import { readFileSync } from 'node:fs';

import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

import type { ExecuteResponse, ItemStatus, StepResult } from '../types.js';
import { RESULT_MARKER, STEP_ATTACHMENT } from './protocol.js';

function collectSteps(result: TestResult): StepResult[] {
  const steps: StepResult[] = [];
  for (const attachment of result.attachments) {
    if (attachment.name !== STEP_ATTACHMENT) continue;
    // 첨부는 본문으로 오기도 하고 파일로 떨어지기도 한다. 둘 다 받는다
    const raw = attachment.body?.toString() ?? (attachment.path === undefined ? undefined : readFileSync(attachment.path, 'utf8'));
    if (raw === undefined) continue;
    steps.push(JSON.parse(raw) as StepResult);
  }
  return steps.sort((a, b) => a.seq - b.seq);
}

function statusOf(result: TestResult, steps: StepResult[]): ItemStatus {
  // 판정할 근거가 없는 끝맺음은 전부 NA다. 실패와 구분돼야 러너 고장과 케이스 실패가 섞이지 않는다 (SPEC §3.2)
  if (result.status === 'timedOut' || result.status === 'interrupted' || result.status === 'skipped') return 'NA';
  if (result.status === 'failed' || steps.some((s) => s.status === 'FAIL')) return 'FAIL';
  return 'PASS';
}

function errorOf(result: TestResult, steps: StepResult[], status: ItemStatus): ExecuteResponse['error'] {
  if (status === 'NA') {
    return { message: result.error?.message ?? '판정 없이 실행이 끝났다' };
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
  onTestEnd(_test: TestCase, result: TestResult): void {
    const steps = collectSteps(result);
    const status = statusOf(result, steps);
    const error = errorOf(result, steps, status);

    const payload: ExecuteResponse = {
      historyId: Number(process.env.PLATFORM_HISTORY_ID ?? 0),
      status,
      durationMs: result.duration,
      steps,
      ...(error === undefined ? {} : { error }),
    };

    process.stdout.write(`${RESULT_MARKER}${JSON.stringify(payload)}\n`);
  }

  printsToStdio(): boolean {
    return true;
  }
}

export default PlatformReporter;
