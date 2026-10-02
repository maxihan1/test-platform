// 서비스폴더인가 판정을 임시 폴더로 부러뜨려 본다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { 서비스폴더인가 } from './service-folder.mjs';

function 임시폴더(파일들) {
  const 폴더 = mkdtempSync(join(tmpdir(), 'ci-covers-'));
  for (const f of 파일들) {
    mkdirSync(dirname(join(폴더, f)), { recursive: true });
    writeFileSync(join(폴더, f), '');
  }
  return 폴더;
}

test('서비스폴더인가는 에이전트가 만든 케이스 모양만 참이다', () => {
  const 판정 = (파일들) => {
    const 폴더 = 임시폴더(파일들);
    try {
      return 서비스폴더인가(폴더);
    } finally {
      rmSync(폴더, { recursive: true, force: true });
    }
  };
  assert.equal(판정(['PAY-001.spec.ts', 'PAY-002.spec.ts']), true);
  assert.equal(
    판정(['MKT-UI-001.spec.ts', 'MKT-041.spec.ts', 'pages/login.page.ts', 'components/site-header.component.ts']),
    true,
  );
  assert.equal(판정(['PAY-001.spec.ts', 'CARD-001.spec.ts']), false);
  assert.equal(판정(['MKT-001.spec.ts', 'PAY-001.spec.ts']), false);
  assert.equal(판정(['PAY-001.spec.ts', 'helpers.ts']), false);
  assert.equal(판정(['MKT-001.spec.ts', 'helper.ts']), false);
  assert.equal(판정([]), false);
  assert.equal(판정(['pay-001.spec.ts']), false);
  assert.equal(판정(['pages/login.page.ts']), false);
  assert.equal(판정(['MKT-001.spec.ts', 'pages/login.page.ts', 'pages/helper.ts']), false);
  assert.equal(판정(['MKT-001.spec.ts', 'pages/a/b.page.ts']), false);
  assert.equal(판정(['MKT-001.spec.ts', 'fixtures/a.page.ts']), false);
});
