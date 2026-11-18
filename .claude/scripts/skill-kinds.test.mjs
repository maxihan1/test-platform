// 작성 지침의 종류 입구 넷과 종류별로 뗀 파일(<이름>-<종류>.md)이 서로 맞는지 본다 (도메인/작성 §3.6 「종류별 작성 AI」)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const 스킬 = '.claude/skills';
const 지침폴더 = ['tpx-cases/references', 'tpx-author/references'];

// 종류 목록은 프로그램이 고르는 값에서 읽는다 — 프로그램에 종류가 늘면 입구도 있어야 한다
const 종류들 = [...readFileSync('scripts/authoring-kind.ts', 'utf8').matchAll(/\['[A-Z]+', '(\w+)'\]/g)].map((m) => m[1]);

const 입구글 = (종류) => readFileSync(join(스킬, `tpx-author-${종류}`, 'SKILL.md'), 'utf8');

/** `## <제목>` 절 안의 `tpx-…/references/….md` 경로들 */
function 절경로(글, 제목) {
  const 시작 = 글.indexOf(`\n## ${제목}\n`);
  if (시작 < 0) return null;
  const 끝 = 글.indexOf('\n## ', 시작 + 1);
  const 몸 = 글.slice(시작, 끝 < 0 ? undefined : 끝);
  return new Set([...몸.matchAll(/`(tpx-(?:cases|author)\/references\/[^`]+\.md)`/g)].map((m) => m[1]));
}

// 뗀 파일 — <이름>-<종류>.md. 이미 한 종류만 다루던 파일(app.md · game.md · api.md · scan-fanout.md)은 이름이 달라 안 걸린다
const 뗀파일들 = 지침폴더.flatMap((폴더) =>
  readdirSync(join(스킬, 폴더)).flatMap((f) => {
    const m = f.match(/^(.+)-(web|app|api|game)\.md$/);
    return m === null ? [] : [{ 경로: `${폴더}/${f}`, 원래: `${폴더}/${m[1]}.md`, 종류: m[2] }];
  }),
);

test('프로그램이 고르는 종류는 web · app · api · game 넷이다', () => {
  assert.deepEqual([...종류들].sort(), ['api', 'app', 'game', 'web']);
});

test('종류마다 입구 스킬이 있고 이름이 폴더와 같으며 공통 절차를 연다', () => {
  for (const 종류 of 종류들) {
    const 글 = 입구글(종류);
    assert.match(글, new RegExp(`^---\\nname: tpx-author-${종류}\\n`), `tpx-author-${종류} 의 name 이 폴더와 다르다`);
    assert.ok(글.includes('.claude/skills/tpx-author/SKILL.md'), `tpx-author-${종류} 가 공통 절차를 열게 하지 않는다`);
    for (const 제목 of ['여는 파일', '열지 않는 파일', '보조 AI 에게 넘길 읽기 목록', '이 종류만의 규칙']) {
      assert.ok(글.includes(`\n## ${제목}\n`), `tpx-author-${종류} 에 「${제목}」 절이 없다`);
    }
  }
});

test('입구가 가리키는 파일이 다 있다', () => {
  for (const 종류 of 종류들) {
    const 글 = 입구글(종류);
    for (const 경로 of [...글.matchAll(/`(tpx-(?:cases|author)\/references\/[^`]+\.md)`/g)].map((m) => m[1])) {
      assert.ok(existsSync(join(스킬, 경로)), `tpx-author-${종류} 가 없는 파일 ${경로} 를 가리킨다`);
    }
  }
});

test('한 입구 안에서 여는 파일과 열지 않는 파일이 겹치지 않는다', () => {
  for (const 종류 of 종류들) {
    const 글 = 입구글(종류);
    const 연다 = 절경로(글, '여는 파일');
    const 안연다 = 절경로(글, '열지 않는 파일');
    const 겹침 = [...연다].filter((p) => 안연다.has(p));
    assert.deepEqual(겹침, [], `tpx-author-${종류} 가 같은 파일을 열고 또 안 연다`);
  }
});

test('뗀 파일마다 자기 종류 입구가 열고 다른 종류 입구는 안 연다고 적었다', () => {
  assert.ok(뗀파일들.length > 0, '뗀 파일이 하나도 없다 — 이름 꼴(<이름>-<종류>.md)이 바뀌었나');
  for (const { 경로, 종류 } of 뗀파일들) {
    assert.ok(절경로(입구글(종류), '여는 파일').has(경로), `${경로} 가 tpx-author-${종류} 「여는 파일」에 없다`);
    for (const 다른 of 종류들.filter((k) => k !== 종류)) {
      // 웹에 남은 앱 케이스 — 웹 입구는 앱 뗀 파일을 「앱 화면 절이 붙으면 더 여는 파일」에 둔다 (결정 8)
      const 조건부 = 다른 === 'web' && 종류 === 'app' && 절경로(입구글(다른), '앱 화면 절이 붙으면 더 여는 파일').has(경로);
      assert.ok(조건부 || 절경로(입구글(다른), '열지 않는 파일').has(경로), `${경로} 가 tpx-author-${다른} 「열지 않는 파일」에 없다`);
    }
  }
});

test('뗀 파일의 원래 파일이 있고 그 자리에 이어 여는 줄을 남겼다', () => {
  for (const { 경로, 원래 } of 뗀파일들) {
    const 이름 = 경로.split('/').pop();
    assert.ok(existsSync(join(스킬, 원래)), `${경로} 의 원래 파일 ${원래} 가 없다`);
    assert.ok(readFileSync(join(스킬, 원래), 'utf8').includes(`\`${이름}\` 를 이어서 연다`), `${원래} 에 「${이름} 를 이어서 연다」 줄이 없다`);
  }
});

test('종류와 상관없는 R9 · R10 은 모든 입구가 열고 케이스 작성 보조에게도 넘긴다', () => {
  const 공통 = 'tpx-cases/references/4-selector-common.md';
  assert.ok(readFileSync(join(스킬, 'tpx-cases/references/4-selector.md'), 'utf8').includes('`4-selector-common.md` 를 이어서 연다'), '4-selector.md 에 이어 여는 줄이 없다');
  for (const 종류 of 종류들) {
    const 글 = 입구글(종류);
    assert.ok(절경로(글, '여는 파일').has(공통), `tpx-author-${종류} 「여는 파일」에 ${공통} 이 없다`);
    const 보조 = 글.slice(글.indexOf('\n## 보조 AI 에게 넘길 읽기 목록\n'), 글.indexOf('\n## 이 종류만의 규칙\n'));
    assert.ok(보조.includes('`4-selector-common.md`'), `tpx-author-${종류} 보조 AI 읽기 목록에 4-selector-common.md 가 없다 — 보조가 R10 을 못 읽는다`);
  }
});

test('게임 입구는 웹 요소 찾기 파일을 안 열고 거기서 뗀 공통 규칙만 연다', () => {
  const 글 = 입구글('game');
  assert.ok(절경로(글, '열지 않는 파일').has('tpx-cases/references/4-selector.md'));
});
