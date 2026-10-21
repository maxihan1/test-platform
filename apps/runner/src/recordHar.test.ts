// 녹화 폴더 만들기와 다음 HAR 파일 이름 세기를 검사한다

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { 녹화폴더, 다음HAR경로 } from './recordHar.js';

const 치울것: string[] = [];
afterEach(() => {
  for (const d of 치울것.splice(0)) rmSync(d, { recursive: true, force: true });
  delete process.env.PLATFORM_ARTIFACTS_DIR;
});

function 임시폴더(): string {
  const d = mkdtempSync(join(tmpdir(), 'har-'));
  치울것.push(d);
  return d;
}

describe('다음HAR경로', () => {
  it('빈 폴더면 1.har, 1.har 가 있으면 2.har 다', () => {
    const 폴더 = 임시폴더();
    expect(다음HAR경로(폴더)).toBe(join(폴더, '1.har'));
    writeFileSync(join(폴더, '1.har'), '{}');
    expect(다음HAR경로(폴더)).toBe(join(폴더, '2.har'));
  });

  it('.har 가 아닌 파일은 세지 않는다', () => {
    const 폴더 = 임시폴더();
    writeFileSync(join(폴더, 'note.txt'), '');
    expect(다음HAR경로(폴더)).toBe(join(폴더, '1.har'));
  });

  it('아직 안 써진 번호를 이미 내줬으면 그 뒤 번호를 준다', () => {
    const 폴더 = 임시폴더();
    expect(다음HAR경로(폴더, 1)).toBe(join(폴더, '2.har'));
  });
});

describe('녹화폴더', () => {
  it('산출물 폴더 아래 perf-record/<jobId> 를 만든다', () => {
    const 뿌리 = 임시폴더();
    process.env.PLATFORM_ARTIFACTS_DIR = 뿌리;
    expect(녹화폴더(7)).toBe(join(뿌리, 'perf-record', '7'));
    expect(다음HAR경로(녹화폴더(7))).toBe(join(뿌리, 'perf-record', '7', '1.har'));
  });
});
