// 「테스트만 바뀌었나」 판정의 판별식. 참이면 훅과 CI 가 가벼운 길로 가므로 틀리면 코드가 검사 없이 들어간다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { 테스트만인가 } from './cases-only.mjs';

const 기존폴더 = ['demo', 'todo'];

test('기존 폴더의 spec 과 docs/cases 의 md 뿐이면 참', () => {
  assert.equal(테스트만인가(['tests/demo/DEMO-012.spec.ts', 'docs/cases/DEMO.md'], 기존폴더), true);
});

test('코드가 하나라도 섞이면 거짓', () => {
  for (const 섞인것 of ['apps/admin/src/x.ts', 'scripts/a.ts', '.github/workflows/ci.yml', 'package.json']) {
    assert.equal(테스트만인가(['tests/todo/TODO-001.spec.ts', 섞인것], 기존폴더), false, 섞인것);
  }
});

test('tests/ 안이라도 spec 이 아닌 파일은 거짓 — 그걸 쓰는 다른 spec 이 안 돈다', () => {
  assert.equal(테스트만인가(['tests/todo/helpers.ts'], 기존폴더), false);
  assert.equal(테스트만인가(['tests/todo/깊은/TODO-001.spec.ts'], 기존폴더), false);
  assert.equal(테스트만인가(['docs/cases/깊은/TODO.md'], 기존폴더), false);
  assert.equal(테스트만인가(['docs/cases/TODO.txt'], 기존폴더), false);
});

test('빈 목록은 거짓 (보수적)', () => {
  assert.equal(테스트만인가([], 기존폴더), false);
});

test('.. 가 든 경로는 거짓', () => {
  assert.equal(테스트만인가(['tests/../apps/x.spec.ts'], 기존폴더), false);
  assert.equal(테스트만인가(['tests/todo/../../apps/x.spec.ts'], 기존폴더), false);
});

test('base 에 없던 새 폴더가 생기면 거짓 — CI 실행 단계에 그 폴더가 없어 다음 무거운 PR 이 빨개진다', () => {
  assert.equal(테스트만인가(['tests/새서비스/NEW-001.spec.ts'], 기존폴더), false);
  assert.equal(테스트만인가(['tests/todo/TODO-001.spec.ts'], []), false);
});

test('명령줄 — 표준입력 목록과 base 로 판정해 종료 코드를 낸다', () => {
  const 스크립트 = fileURLToPath(new URL('./cases-only.mjs', import.meta.url));
  const 돌린다 = (입력, base) => {
    try {
      execFileSync('node', [스크립트, base], { input: 입력, stdio: ['pipe', 'pipe', 'pipe'] });
      return 0;
    } catch (e) {
      return e.status;
    }
  };
  assert.equal(돌린다('tests/todo/TODO-001.spec.ts\ndocs/cases/TODO.md\n', 'origin/main'), 0);
  assert.equal(돌린다('tests/todo/TODO-001.spec.ts\napps/x.ts\n', 'origin/main'), 1);
  assert.equal(돌린다('tests/todo/TODO-001.spec.ts\n', '없는-ref-xyz'), 1, 'base 를 못 읽으면 무거운 길이어야 한다');
});

test('명령줄 — 심링크·대소문자만 다른 경로로 불려도 판정한다 (본체를 건너뛰고 0 을 내면 코드가 검사 없이 들어간다)', () => {
  const 스크립트 = fileURLToPath(new URL('./cases-only.mjs', import.meta.url));
  const 자리 = mkdtempSync(join(tmpdir(), 'cases-only-link-'));
  try {
    const 링크 = join(자리, 'scripts');
    symlinkSync(dirname(스크립트), 링크);
    const 돌린다 = (경로) => {
      try {
        execFileSync('node', [경로, 'origin/main'], { input: 'apps/x.ts\n', stdio: ['pipe', 'pipe', 'pipe'] });
        return 0;
      } catch (e) {
        return e.status;
      }
    };
    assert.equal(돌린다(join(링크, 'cases-only.mjs')), 1, '심링크 경로');
    assert.equal(돌린다(join(dirname(스크립트), 'CASES-ONLY.mjs')), 1, '대소문자만 다른 경로');
  } finally {
    rmSync(자리, { recursive: true, force: true });
  }
});
