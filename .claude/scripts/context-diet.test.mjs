// 컨텍스트 줄이기(PR #177)가 옮긴 자리를 가리키는 곳이 어긋나지 않게 지키는 검사.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
// `apps/admin/CLAUDE.md` 가 아닌 맨 `CLAUDE.md` 언급을 찾는다
const 맨CLAUDE = /(?<!apps\/admin\/)CLAUDE\.md/;

test('할 일 1 — fixture 접두사 목록이 apps/admin/CLAUDE.md 로 옮겨졌다', () => {
  const 루트 = read('CLAUDE.md');
  const 하위 = read('apps/admin/CLAUDE.md');
  assert.ok(하위.includes('`XWA`('), '대조군 — 옮긴 쪽에 접두사 줄이 있어야 한다');
  assert.ok(!루트.includes('`XWA`('), '루트 CLAUDE.md 에 접두사 등록 줄이 남아 있다');
  assert.ok(루트.includes('apps/admin/CLAUDE.md'), '루트가 옮긴 자리를 안 가리킨다');
  assert.ok(하위.includes('새 접두사를 쓰면 이 줄에 적는다'), '하위 파일에 등록 규칙이 없다');
});

test('할 일 1 — spec-review G 체크리스트가 접두사 정본으로 apps/admin/CLAUDE.md 를 가리킨다', () => {
  const g = read('.claude/skills/spec-review/references/checklist-g-h.md');
  assert.ok(g.includes('G3는 1회로 본다'), '대조군 — 찾는 줄이 실제로 있어야 한다');
  assert.ok(g.includes('apps/admin/CLAUDE.md'), 'apps/admin/CLAUDE.md 를 안 가리킨다');
  assert.doesNotMatch(g, 맨CLAUDE, '옛 루트 CLAUDE.md §3 를 아직 가리킨다');
});

test('할 일 1 — SETUP 의 fixture 줄이 apps/admin/CLAUDE.md 를 가리킨다', () => {
  const 줄 = read('docs/SETUP.md').split('\n').find((l) => l.includes('검사 전에 치운다'));
  assert.ok(줄, '대조군 — 찾는 줄이 실제로 있어야 한다');
  assert.ok(줄.includes('apps/admin/CLAUDE.md'), 'apps/admin/CLAUDE.md 를 안 가리킨다');
  assert.doesNotMatch(줄, 맨CLAUDE, '옛 루트 CLAUDE.md 를 아직 가리킨다');
});
