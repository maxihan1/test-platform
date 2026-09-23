// 작성 에이전트 공용 손 검사 — 판정 스크립트 고정 · 닫기 · 시간 초과
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { 판정기만들기 } from './authoring-io.js';

const 치울것: string[] = [];
afterEach(() => {
  for (const 자리 of 치울것.splice(0)) rmSync(자리, { recursive: true, force: true });
});

function 임시폴더(): string {
  const 자리 = mkdtempSync(join(tmpdir(), 'authoring-io-test-'));
  치울것.push(자리);
  return 자리;
}

// 받은 목록이 'tests/a.spec.ts' 하나이고 기준이 'BASE' 일 때만 통과하는 가짜 판정
const 가짜판정 = [
  "import { readFileSync } from 'node:fs';",
  "const 목록 = readFileSync(0, 'utf8');",
  "process.exit(목록 === 'tests/a.spec.ts\\n' && process.argv[2] === 'BASE' ? 0 : 1);",
].join('\n');

describe('판정기 — 켤 때 판정 스크립트를 메모리에 고정한다', () => {
  it('목록은 표준입력, 기준은 인자로 넘긴다', () => {
    const 자리 = 임시폴더();
    const 스크립트 = join(자리, 'cases-only.mjs');
    writeFileSync(스크립트, 가짜판정);
    const 판정 = 판정기만들기(스크립트);
    expect(판정(['tests/a.spec.ts'], 'BASE', 자리)).toBe(true);
    expect(판정(['apps/x.ts'], 'BASE', 자리)).toBe(false);
    expect(판정(['tests/a.spec.ts'], 'origin/main', 자리)).toBe(false);
  });

  it('켠 뒤 파일이 「늘 통과」로 바뀌어도 판정은 켤 때 내용 그대로다', () => {
    const 자리 = 임시폴더();
    const 스크립트 = join(자리, 'cases-only.mjs');
    writeFileSync(스크립트, 가짜판정);
    const 판정 = 판정기만들기(스크립트);
    writeFileSync(스크립트, 'process.exit(0);');
    expect(판정(['apps/x.ts'], 'BASE', 자리)).toBe(false);
  });

  // 맥의 tmpdir 은 /var → /private/var 심링크다. 진짜 스크립트의 「직접 불렸나」 비교가 어긋나면
  // 판정 본체가 안 돌고 종료 0 이라 **무엇이든 통과한다** (2026-09-23 실측)
  it('진짜 cases-only.mjs 로도 코드 파일은 통과하지 못한다', () => {
    const 판정 = 판정기만들기('.claude/scripts/cases-only.mjs');
    expect(판정(['apps/admin/x.ts'], 'HEAD', process.cwd())).toBe(false);
    expect(판정(['docs/cases/DEMO.md'], 'HEAD', process.cwd())).toBe(true);
  });
});
