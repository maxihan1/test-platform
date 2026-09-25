// lane.mjs 가 바뀐 파일 목록을 차선 넷(docs · spec · cases · full)으로 가르는지 본다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lane } from './lane.mjs';

const 기존폴더 = ['todo', 'demo'];

const 표 = [
  [['docs/SETUP.md'], 'docs', '문서만'],
  [['README.md'], 'docs', '루트 md'],
  [['docs/design-mockup.html'], 'docs', 'docs 아래 html'],
  [['docs/spec/도메인/작성.md'], 'spec', '명세 장'],
  [['docs/SPEC.md', 'docs/HOOKS.md'], 'spec', '색인 + 문서'],
  [['tests/todo/TODO-001.spec.ts'], 'cases', '기존 폴더 케이스'],
  [['tests/todo/TODO-001.spec.ts', 'docs/cases/TODO.md'], 'cases', '케이스 + 케이스 문서'],
  [['docs/cases/TODO.md', 'docs/SETUP.md'], 'docs', '케이스 문서 + 일반 문서'],
  [['tests/새폴더/X-001.spec.ts'], 'full', '새 케이스 폴더는 CI 실행 단계에 없다'],
  [['tests/todo/TODO-001.spec.ts', 'docs/SETUP.md'], 'full', '케이스 + 일반 문서는 cases 도 docs 도 아니다'],
  [['apps/admin/src/app.ts'], 'full', '코드'],
  [['docs/spec/x.md', 'apps/admin/src/app.ts'], 'full', '명세 + 코드'],
  [['CLAUDE.md'], 'full', '규칙 파일은 HARNESS'],
  [['.claude/skills/tpx/SKILL.md'], 'full', '스킬 md 는 HARNESS'],
  [['apps/새앱/index.html'], 'full', 'docs 밖 html 은 DOC 표면이어도 docs 차선이 아니다'],
  [['docs/x/build.ts'], 'full', 'docs 아래라도 문서 확장자가 아니면 코드다'],
  [['docs/reviews/.gitkeep'], 'docs', 'docs 아래 .gitkeep'],
  [['foo/bar.txt'], 'full', '미분류'],
  [['docs/../apps/x.ts'], 'full', '.. 경로'],
  [[], 'full', '빈 목록'],
];

for (const [파일들, 기대, 이름] of 표) {
  test(`lane: ${이름} → ${기대}`, () => {
    assert.equal(lane(파일들, 기존폴더), 기대);
  });
}

const 스크립트 = fileURLToPath(new URL('./lane.mjs', import.meta.url));
const 돌린다 = (입력, ...인자) =>
  execFileSync('node', [스크립트, ...인자], { input: 입력, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();

test('lane CLI: 차선을 lane=<이름> 으로 찍는다', () => {
  assert.equal(돌린다('docs/SETUP.md\n', 'origin/main'), 'lane=docs');
  assert.equal(돌린다('docs/spec/도메인/작성.md\n', 'origin/main'), 'lane=spec');
  assert.equal(돌린다('tests/todo/TODO-001.spec.ts\n', 'origin/main'), 'lane=cases');
  assert.equal(돌린다('apps/admin/src/app.ts\n', 'origin/main'), 'lane=full');
});

test('lane CLI: 판정을 못 하면 full 이고 종료 코드는 0 이다', () => {
  assert.equal(돌린다('docs/SETUP.md\n'), 'lane=full', 'base 인자 없음');
  assert.equal(돌린다('docs/SETUP.md\n', '없는-ref-xyz'), 'lane=full', '없는 ref');
  assert.equal(돌린다('', 'origin/main'), 'lane=full', '빈 입력');
});

test('detect-tier 가 등급 옆에 차선도 찍는다 — /tpx 가 명세만 바뀐 일을 가볍게 돌리는 근거', () => {
  const 판정기 = fileURLToPath(new URL('./detect-tier.mjs', import.meta.url));
  const 찍는다 = (...경로) => execFileSync('node', [판정기, ...경로], { encoding: 'utf8' });
  assert.match(찍는다('docs/spec/도메인/작성.md'), /^차선: spec$/m);
  assert.match(찍는다('docs/SETUP.md'), /^차선: docs$/m);
  assert.match(찍는다('apps/admin/src/app.ts'), /^차선: full$/m);
});

test('cases-only.mjs 는 그대로다 — 문서만 바뀐 목록에 종료 1 (작성 에이전트의 병합 판정)', () => {
  const 판정기 = fileURLToPath(new URL('./cases-only.mjs', import.meta.url));
  const 종료 = (입력) => {
    try {
      execFileSync('node', [판정기, 'origin/main'], { input: 입력, stdio: ['pipe', 'pipe', 'pipe'] });
      return 0;
    } catch (e) {
      return e.status;
    }
  };
  assert.equal(종료('docs/SETUP.md\n'), 1);
  assert.equal(종료('docs/spec/도메인/작성.md\n'), 1);
});
