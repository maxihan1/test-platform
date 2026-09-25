// lane.mjs 가 바뀐 파일 목록을 차선 넷(docs · spec · cases · full)으로 가르는지 본다
import { test } from 'node:test';
import assert from 'node:assert/strict';
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
  [['foo/bar.txt'], 'full', '미분류'],
  [['docs/../apps/x.ts'], 'full', '.. 경로'],
  [[], 'full', '빈 목록'],
];

for (const [파일들, 기대, 이름] of 표) {
  test(`lane: ${이름} → ${기대}`, () => {
    assert.equal(lane(파일들, 기존폴더), 기대);
  });
}
