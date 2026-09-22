// 케이스 엔진의 화면 탐침이 약속대로 서 있는지 본다.
// 탐침은 「기획서에 없는 단 하나의 정보」를 얻는 자리라, 여기가 조용히 옛날로 돌아가면
// 케이스가 전부 지어낸 locator 로 만들어지고 실행에서야 드러난다 (2026-09-22).

import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const 스킬 = new URL('../skills/tpx-cases/SKILL.md', import.meta.url);
const 사전 = new URL('../../docs/cases/TODO.md', import.meta.url);

// 절 경계는 `## §` 로만 본다. 본문 안의 예시 블록에도 `## 용어 사전` 같은 머리글이 들어 있어서
// 그냥 `## ` 로 끊으면 §4 가 예시 한복판에서 잘린다 (2026-09-22 — 이 검사가 처음에 그렇게 걸렸다)
function 절(본문, 제목) {
  const 시작 = 본문.indexOf(제목);
  if (시작 < 0) return null;
  const 다음 = 본문.indexOf('\n## §', 시작 + 제목.length);
  return 본문.slice(시작, 다음 < 0 ? undefined : 다음);
}

test('탐침이 playwright-cli 로 돈다 — 옛 한 줄 탐침은 로그인 뒤 화면을 못 봤다', () => {
  const 본문 = 절(readFileSync(스킬, 'utf8'), '## §4. selector 확정');
  assert.ok(본문, '§4 를 못 찾았다 — 절 제목이 바뀌었으면 이 검사도 같이 고친다');
  assert.match(본문, /playwright-cli -s=/, '세션을 쓰는 탐침 명령이 없다');
  const 명령들 = [...본문.matchAll(/```bash\n([\s\S]*?)```/g)].map((m) => m[1]).join('\n');
  assert.doesNotMatch(
    명령들,
    /chromium\.launch/,
    '옛 한 줄 탐침이 명령으로 되살아났다 — 그것은 로그인도 못 하고 상호작용 뒤 상태도 못 본다',
  );
});

test('해시를 낼 때 요소 번호를 뺀다 — 안 빼면 같은 화면이 매번 다른 값을 낸다', () => {
  const 본문 = 절(readFileSync(스킬, 'utf8'), '## §4. selector 확정');
  const 해시줄 = 본문.split('\n').find((줄) => 줄.includes('shasum'));
  assert.ok(해시줄, '해시를 내는 명령이 §4 에 없다');
  assert.match(
    해시줄,
    /ref=/,
    '해시 명령이 요소 번호를 안 뺀다 — 한 번 이동하면 ref 에 f1 접두사가 붙어 캐시가 영영 안 맞는다',
  );
});

test('벤더 스킬의 생성 절차를 따르지 말라고 못박혀 있다', () => {
  const 본문 = 절(readFileSync(스킬, 'utf8'), '## §4. selector 확정');
  assert.match(본문, /test-generation\.md/, '벤더 스킬의 생성 절차를 가리키는 경고가 없다');
  assert.match(본문, /R10/, '기대값을 화면에서 읽는 것이 왜 금지인지가 안 적혀 있다');
  assert.match(본문, /nth\(/, 'CLI 가 뱉는 nth() 를 그대로 쓰지 말라는 경고가 없다');
});

test('살아 있는 캐시가 스킬과 같은 알고리즘을 적는다 — 둘이 갈리면 캐시가 조용히 죽는다', () => {
  const 줄 = readFileSync(사전, 'utf8')
    .split('\n')
    .find((한줄) => 한줄.includes('화면 스냅샷 해시'));
  assert.ok(줄, 'TODO 용어 사전에 스냅샷 해시 줄이 없다');
  assert.match(
    줄,
    /요소 번호를 뺀/,
    '사전의 해시가 옛 방식으로 적혀 있다 — 다음 실행이 「화면이 바뀌었다」로 잘못 읽는다',
  );
});
