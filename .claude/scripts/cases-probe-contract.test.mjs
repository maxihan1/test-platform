// 케이스 엔진의 화면 탐침이 약속대로 서 있는지 본다.
// 탐침은 「기획서에 없는 단 하나의 정보」를 얻는 자리라, 여기가 조용히 옛날로 돌아가면
// 케이스가 전부 지어낸 locator 로 만들어지고 실행에서야 드러난다 (2026-09-22).
//
// ★ 단언은 **자리를 좁혀서** 건다. 첫 판에는 `R10`·`nth(` 가 파일 어디에나 있으면 통과였는데
//    그 낱말들은 **바꾸기 전 파일에도 이미 있었다** — 즉 영원히 안 무는 단언이었다.
//    그래서 지금은 그 경고가 사는 하위 절 안에서만 찾는다.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const 스킬폴더 = new URL('../skills/tpx-cases/', import.meta.url);
const 참고폴더 = new URL('references/', 스킬폴더);
// §4 가 references/ 로 옮겨 가도 같은 단언이 물도록 SKILL.md 와 references/*.md 를 이어 읽는다
const 스킬본문 = () =>
  [
    readFileSync(new URL('SKILL.md', 스킬폴더), 'utf8'),
    ...(existsSync(참고폴더) ? readdirSync(참고폴더).filter((f) => f.endsWith('.md')).sort() : []).map((f) =>
      readFileSync(new URL(f, 참고폴더), 'utf8'),
    ),
  ].join('\n');
const 사전 = new URL('../../docs/cases/TODO.md', import.meta.url);
const 설치 = new URL('../../docs/SETUP.md', import.meta.url);

// 절 경계는 `§` 가 붙은 머리글로 본다. 그냥 `## ` 로 끊으면 본문의 예시 블록 안에 있는
// `## 용어 사전` 에 걸려 §4 가 한복판에서 잘리고, `## §` 로만 보면 이 저장소가 쓰는
// `## 🛑 §3` 같은 이모지 머리글을 놓쳐 슬라이스가 파일 끝까지 삼킨다 (2026-09-22).
function 절(본문, 제목) {
  const 시작 = 본문.indexOf(제목);
  if (시작 < 0) return null;
  const 뒤 = 본문.slice(시작 + 제목.length);
  const 다음 = 뒤.search(/\n## [^\n]*§\d/);
  return 제목 + (다음 < 0 ? 뒤 : 뒤.slice(0, 다음));
}

function 하위절(본문, 머리) {
  const 시작 = 본문.indexOf(머리);
  if (시작 < 0) return null;
  const 뒤 = 본문.slice(시작 + 머리.length);
  const 다음 = 뒤.indexOf('\n### ');
  return 머리 + (다음 < 0 ? 뒤 : 뒤.slice(0, 다음));
}

const 넷째절 = () => 절(스킬본문(), '## §4. selector 확정');

test('§4 슬라이스가 §5 직전에서 끊긴다 — 안 끊기면 아래 단언들이 통째로 공허해진다', () => {
  const 본문 = 넷째절();
  assert.ok(본문, '§4 를 못 찾았다 — 절 제목이 바뀌었으면 이 검사도 같이 고친다');
  assert.doesNotMatch(본문, /## §5\./, '§4 슬라이스가 §5 를 삼켰다 — 절 경계 규칙이 깨졌다');
  assert.match(본문, /용어 사전/, '§4 슬라이스가 용어 사전 앞에서 잘렸다 — 너무 좁다');
});

test('탐침 명령이 §4 의 첫 명령 블록 자리에 있다 — 떠도는 글자로는 못 넘는다', () => {
  const 첫블록 = /```bash\n([\s\S]*?)```/.exec(넷째절())?.[1] ?? '';
  assert.match(
    첫블록,
    /^npx playwright cli -s=/m,
    '§4 의 첫 명령 블록이 탐침이 아니다 — 절차가 통째로 딴것으로 바뀌었다',
  );
  assert.doesNotMatch(
    첫블록,
    /chromium\.launch|read_page/,
    '옛 경로(한 줄 탐침 · 크롬 MCP)가 되살아났다 — 둘 다 로그인 뒤 화면을 못 본다',
  );
});

test('탐침을 전역으로 깔라고 하지 않는다 — 러너와 다른 Playwright 를 타게 된다', () => {
  for (const [어디, 자리] of [['스킬 §4', 넷째절()], ['SETUP', readFileSync(설치, 'utf8')]]) {
    const 권함 = 자리
      .split('\n')
      .filter((줄) => /npm install -g .*playwright/.test(줄))
      .filter((줄) => !/마라|말라|않는다|금지/.test(줄));
    assert.deepEqual(권함, [], `${어디} 가 전역 설치를 권한다 — 저장소는 버전을 못박아 뒀다`);
  }
});

test('해시 명령이 요소 번호를 뺀다 — 안 빼면 같은 화면이 매번 다른 값을 낸다', () => {
  const 해시줄 = 넷째절()
    .split('\n')
    .find((줄) => 줄.includes('shasum'));
  assert.ok(해시줄, '해시를 내는 명령이 §4 에 없다');
  assert.match(해시줄, /npx playwright cli/, '해시를 옛 도구로 낸다');
  assert.match(
    해시줄,
    /ref=/,
    '해시 명령이 요소 번호를 안 뺀다 — 한 번 이동하면 ref 에 f1 접두사가 붙어 캐시가 영영 안 맞는다',
  );
});

test('벤더 생성 절차를 따르지 말라는 경고가 그 자리에 있다', () => {
  const 블록 = 하위절(넷째절(), '### ★ 벤더 스킬의');
  assert.ok(블록, '벤더 경계를 긋는 하위 절이 사라졌다');
  assert.match(블록, /test-generation\.md/, '어느 문서를 따르지 말라는 것인지 안 적혀 있다');
  assert.match(블록, /R10/, '기대값을 화면에서 읽는 것이 왜 금지인지가 그 자리에 없다');
});

test('CLI 가 뱉는 nth() 를 그대로 쓰지 말라는 경고가 그 자리에 있다', () => {
  const 블록 = 하위절(넷째절(), '### ★ CLI 가 뱉는 코드');
  assert.ok(블록, 'CLI 출력을 어떻게 다룰지 적은 하위 절이 사라졌다');
  assert.match(블록, /nth\(/, '같은 것이 둘일 때 nth() 가 나온다는 실측이 그 자리에 없다');
});

test('살아 있는 캐시가 알고리즘을 옮겨 적지 않고 정본을 가리킨다', () => {
  const 사전절 = readFileSync(사전, 'utf8').split('## 용어 사전')[1] ?? '';
  const 해시줄들 = 사전절.split('\n').filter((줄) => 줄.includes('화면 스냅샷 해시'));
  assert.equal(해시줄들.length, 1, '스냅샷 해시 줄이 하나가 아니다');
  assert.doesNotMatch(
    해시줄들[0],
    /sha256|shasum|md5/,
    '사전이 알고리즘을 산문으로 옮겨 적었다 — 옮겨 적은 것이 다음 어긋남이다 (CLAUDE.md §2.7①)',
  );
  assert.match(
    사전절.slice(0, 1500),
    /tpx-cases\/SKILL\.md.*§4|§4[^\n]*tpx-cases/s,
    '사전이 해시를 내는 정본(§4)을 안 가리킨다',
  );
});
