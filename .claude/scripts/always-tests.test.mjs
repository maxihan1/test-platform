// 「바뀐 부분만」 vitest(--changed)가 못 고르는 검사가 항상 도는 목록(test:always)에 다 들어 있는지 본다
//
// --changed 는 import 관계만 따라간다. 저장소 파일을 readFileSync 로 직접 훑는 검사
// (예: 모든 route 에 인증이 붙었나 — gate.test.ts)는 그 파일이 바뀌어도 안 골라진다.
// 새 검사가 이 모양으로 생기면 여기서 빨간불이 나야 조용히 빠지지 않는다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const 루트 = fileURLToPath(new URL('../../', import.meta.url));
const 패키지 = JSON.parse(readFileSync(join(루트, 'package.json'), 'utf8'));

// 면제는 여기 한 곳에만 둔다. 사유 없이 이름만 더하지 않는다.
const 면제 = new Map([
  ['apps/admin/src/reporting/collect.test.ts', '읽는 collect.ts 를 import 도 한다 — --changed 가 고른다'],
  ['scripts/authoring-token.test.ts', '테스트가 만든 임시 파일만 읽는다'],
]);

function 테스트파일들(폴더) {
  const 결과 = [];
  const 돈다 = (상대) => {
    for (const 것 of readdirSync(join(루트, 상대), { withFileTypes: true })) {
      if (것.name === 'node_modules' || 것.name === 'dist') continue;
      const 길 = `${상대}/${것.name}`;
      if (것.isDirectory()) 돈다(길);
      else if (/\.test\.tsx?$/.test(것.name)) 결과.push(길);
    }
  };
  if (existsSync(join(루트, 폴더))) 돈다(폴더);
  return 결과;
}

const 목록 = () => (패키지.scripts['test:always'] ?? '').split(/\s+/).filter((t) => /\.test\.tsx?$/.test(t));

test('test:always 스크립트가 있고 vitest run 이다', () => {
  assert.match(패키지.scripts['test:always'] ?? '', /^vitest run /);
});

test('저장소 파일을 직접 읽는 vitest 검사는 전부 test:always 에 있다', () => {
  const 빠진것 = ['apps', 'packages', 'scripts']
    .flatMap(테스트파일들)
    .filter((f) => /readFileSync\((?!0\s*,)/.test(readFileSync(join(루트, f), 'utf8')))
    .filter((f) => !면제.has(f) && !목록().includes(f));
  assert.deepEqual(빠진것, [], `test:always 에 넣거나 면제에 사유와 함께 적어라: ${빠진것.join(' · ')}`);
});

// vitest 는 바뀐 파일의 **절대 경로**를 이 패턴에 댄다. `db/migrations/**` 처럼 상대로 적으면
// 어디서도 안 걸린다 — `**/` 로 시작해야 한다 (2026-09-25 picomatch 로 실측).
// 그리고 경로에 점 폴더(.claude/worktrees)가 끼면 `**/` 도 안 걸린다 — 그래서 pre-push 는 이것에 기대지 않는다
test('migration · DB 초기 스크립트가 바뀌면 vitest 가 전체를 다시 돈다 — import 되지 않는 파일이다', () => {
  const 설정 = readFileSync(join(루트, 'vitest.config.ts'), 'utf8');
  assert.match(설정, /forceRerunTriggers:[^\]]*'\*\*\/db\/migrations\/\*\*'/s);
  assert.match(설정, /forceRerunTriggers:[^\]]*'\*\*\/db\/init\/\*\*'/s);
  // lockfile · tsconfig 도 import 로 안 이어진다. vitest 기본 트리거는 package.json 과 자기 설정뿐이다 (PR #70 검토)
  assert.match(설정, /forceRerunTriggers:[^\]]*'\*\*\/package-lock\.json'/s);
  assert.match(설정, /forceRerunTriggers:[^\]]*'\*\*\/tsconfig\.json'/s);
  assert.match(설정, /\.\.\.configDefaults\.forceRerunTriggers/, '기본값(package.json · 설정 파일)을 덮어쓰지 않는다');
});

// docs·spec 차선은 check:workflow 를 안 돈다. 그래서 문서 **내용**을 읽는 판별식은 check:docs-contract 로 따로 돈다 —
// 안 그러면 SETUP.md 를 망가뜨린 문서 PR 이 초록으로 들어가고 다음 코드 PR 이 빨개진다 (PR #70 검토)
const 문서계약면제 = new Map([
  ['ci-covers-tests.test.mjs', 'ci.yml 과 tests/ 만 읽는다 — docs/ 는 면제 사유 글 안에만 나온다'],
  ['hook-contract.test.mjs', '훅 파일과 임시 저장소만 읽는다 — docs/ 는 임시 저장소에 만드는 경로다'],
  ['always-tests.test.mjs', 'package.json · vitest.config.ts · 테스트 소스만 읽는다'],
]);

test('docs/ 의 내용을 읽는 판별식은 전부 check:docs-contract 에 있다', () => {
  const 목록 = 패키지.scripts['check:docs-contract'] ?? '';
  const 스크립트 = join(루트, '.claude/scripts');
  const 빠진것 = readdirSync(스크립트)
    .filter((f) => f.endsWith('.test.mjs'))
    .filter((f) => {
      const 글 = readFileSync(join(스크립트, f), 'utf8');
      return /readFileSync\(/.test(글) && /['"`][^'"`\n]*docs\//.test(글);
    })
    .filter((f) => !문서계약면제.has(f) && !목록.includes(`.claude/scripts/${f}`));
  assert.match(목록, /^node --test /, 'check:docs-contract 스크립트가 없다');
  assert.deepEqual(빠진것, [], `check:docs-contract 에 넣거나 면제에 사유와 함께 적어라: ${빠진것.join(' · ')}`);
});

test('test:always 에 적힌 파일은 실재한다', () => {
  const 없는것 = 목록().filter((f) => !existsSync(join(루트, f)));
  assert.deepEqual(없는것, []);
});
