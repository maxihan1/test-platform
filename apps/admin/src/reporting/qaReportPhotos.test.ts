// QA 리포트 사진 — UI 구획은 실패 항목의 사진만 심고 통과 항목은 뺀다. 기능 구획은 증적처럼 다 심는다 (도메인/리포팅 §3.17 결정 8)
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { EvidenceItem } from './collect.js';
import type { 문서재료 } from './qaReportDoc.js';
import { 사진심은 } from './qaReportDoc.js';

const 앞폴더 = process.env.PLATFORM_ARTIFACTS_DIR;
let 폴더 = '';

beforeAll(async () => {
  폴더 = await mkdtemp(join(tmpdir(), 'qa-photo-'));
  process.env.PLATFORM_ARTIFACTS_DIR = 폴더;
  await mkdir(join(폴더, 'runs', '1'), { recursive: true });
  await writeFile(join(폴더, 'runs', '1', 'a.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
});

afterAll(async () => {
  if (앞폴더 === undefined) delete process.env.PLATFORM_ARTIFACTS_DIR;
  else process.env.PLATFORM_ARTIFACTS_DIR = 앞폴더;
  await rm(폴더, { recursive: true, force: true });
});

const 항목 = (tcId: string, status: EvidenceItem['status']): EvidenceItem => ({
  tcId, tcName: tcId, platform: 'desktop', device: null, farm: null, attempt: 1, status, durationMs: 1, notRunReason: null, unconfirmed: null,
  precondition: [], params: [], expected: [],
  steps: [{ seq: 1, title: '보기', status: status === 'NOT_RUN' ? 'NA' : status, durationMs: 1, assertions: [], screenshotPath: 'artifacts/runs/1/a.png' }],
});

describe('QA 리포트 사진', () => {
  it('UI 는 실패 항목만 사진을 심고, 기능은 통과 항목도 심는다', async () => {
    const 재료 = {
      항목: [항목('XQ-UI-001', 'FAIL'), 항목('XQ-UI-002', 'PASS'), 항목('XQ-FN-001', 'PASS')],
      종류: new Map([['XQ-UI-001', 'UI'], ['XQ-UI-002', 'UI'], ['XQ-FN-001', 'FN']]),
      시나리오: [],
    } as unknown as 문서재료;
    const 심은 = await 사진심은(재료);
    const 사진 = (tcId: string) => 심은.항목.find((i) => i.tcId === tcId)!.steps[0]!.screenshotPath;
    expect(사진('XQ-UI-001')).toMatch(/^data:image\/png;base64,/);
    expect(사진('XQ-UI-002')).toBeNull();
    expect(사진('XQ-FN-001')).toMatch(/^data:image\/png;base64,/);
  });
});
