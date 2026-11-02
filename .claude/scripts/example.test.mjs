// 작성 스킬의 본보기(tpx-cases references/example.md)가 남아 있고 POM 꼴을 지키는지, 스킬이 그 본보기만 가리키는지 본다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const 본보기 = '.claude/skills/tpx-cases/references/example.md';
// 본보기를 가리켜야 하는 자리 — 옛 본보기(tests/ 안 케이스)를 가리키면 작성 요청이 지운 파일을 찾거나 규칙을 어긴 케이스를 따라 쓴다
const 가리키는곳 = [
  '.claude/skills/tpx-cases/SKILL.md',
  '.claude/skills/tpx-cases/references/5-writing.md',
  '.claude/skills/tpx-author/references/fanout.md',
];

const 블록들 = (글) => [...글.matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => m[1]);

test('본보기 파일이 있다', () => {
  assert.ok(existsSync(본보기), `${본보기} 가 없다 — 작성 AI 가 따라 쓸 본보기가 사라졌다`);
});

test('본보기 케이스는 locator 를 직접 쓰지 않고 Page Object 를 가져다 쓴다', () => {
  const [케이스] = 블록들(readFileSync(본보기, 'utf8'));
  assert.ok(케이스 !== undefined, '본보기에 ts 코드 블록이 없다');
  assert.match(케이스, /defineCase\(/);
  assert.match(케이스, /from '\.\/pages\/[a-z][a-z0-9-]*\.page\.js'/);
  assert.doesNotMatch(케이스, /page\.(getBy[A-Za-z]+|locator)\(/, '케이스 블록에서 page 로 요소를 바로 찾는다');
});

test('본보기에 Page Object · Component 블록이 있다', () => {
  const 블록 = 블록들(readFileSync(본보기, 'utf8'));
  assert.ok(블록.some((b) => /static readonly 주소 = '\//.test(b)), 'Page Object 블록이 없다');
  assert.ok(블록.some((b) => /export class \S+ \{/.test(b) && !/static readonly 주소/.test(b)), 'Component 블록이 없다');
});

test('스킬은 본보기 파일을 가리키고 옛 본보기를 가리키지 않는다', () => {
  for (const 파일 of 가리키는곳) {
    const 글 = readFileSync(파일, 'utf8');
    assert.match(글, /references\/example\.md/, `${파일} 이 본보기를 가리키지 않는다`);
    assert.doesNotMatch(글, /DEMO-011/, `${파일} 이 지워진 옛 본보기를 가리킨다`);
  }
});
