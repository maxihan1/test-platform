// 검토 구조 정리(PR #179)가 계획 검토를 저장소 안 기준으로 옮긴 자리를 지키는 검사.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { 절, 소절, 펜스블록 } from './md-sections.mjs';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const PR = '.claude/skills/tpx-plan-review/SKILL.md';
const LENSES = '.claude/skills/tpx-plan-review/references/lenses.md';

test('할 일 1 — 계획 검토 SKILL.md 가 gstack 렌즈 스킬을 부르지 않는다', () => {
  const 본 = read(PR);
  assert.ok(본.includes('## Step 1'), '대조군 — 읽은 파일이 계획 검토 SKILL.md 여야 한다');
  for (const 낱말 of ['plan-eng-review', 'plan-ceo-review', 'plan-design-review', 'gstack:']) {
    assert.ok(!본.includes(낱말), `"${낱말}" 이 남았다`);
  }
});

test('할 일 1 — lenses.md 에 공학 · 제품 · 화면 세 절과 번호 붙은 항목이 있다', () => {
  assert.ok(existsSync(new URL(LENSES, ROOT)), 'lenses.md 가 없다');
  const 글 = read(LENSES);
  for (const [제목, 머리] of [['## 공학', 'E'], ['## 제품', 'P'], ['## 화면', 'D']]) {
    const 본 = 절(글, 제목);
    assert.ok(본, `"${제목}" 절이 없다`);
    assert.match(본, new RegExp(`(^|\\n)\\s*[-*]?\\s*\\*{0,2}${머리}1\\b`), `${제목} 절에 ${머리}1 항목이 없다`);
  }
});

test('할 일 1 — Step 1 표가 등급마다 lenses.md 의 세 절을 가리킨다', () => {
  const 표 = 절(read(PR), '## Step 1');
  assert.ok(표, '대조군 — Step 1 절이 있어야 한다');
  const 행 = (등급) => 표.split('\n').find((l) => new RegExp(`\\|\\s*\\*{0,2}${등급}\\*{0,2}\\s*\\|`).test(l)) ?? '';
  assert.match(행(2), /공학/, '2등급 행이 공학 절을 안 가리킨다');
  assert.match(행(3), /공학/, '3등급 행이 공학 절을 안 가리킨다');
  assert.match(행(3), /제품/, '3등급 행이 제품 절을 안 가리킨다');
  assert.ok(표.includes('화면'), '화면을 건드릴 때를 안 적었다');
  assert.ok(read(PR).includes('references/lenses.md'), 'SKILL.md 가 lenses.md 를 가리키지 않는다');
});

test('할 일 1 — 렌즈를 general-purpose · Opus 서브 에이전트로 내고 프롬프트에 위치 셋을 싣는다', () => {
  const 호출 = 절(read(PR), '## Step 2');
  assert.ok(호출, '대조군 — Step 2 절이 있어야 한다');
  const 블록 = 펜스블록(호출, 'Agent({');
  assert.ok(블록.includes('Agent({'), '대조군 — Step 2 코드 펜스 안에 호출 블록이 있어야 한다');
  assert.match(블록, /subagent_type: "general-purpose"/, '호출 블록에 general-purpose 서브 에이전트 줄이 없다');
  assert.match(블록, /model: "opus"/, '호출 블록에 model: "opus" 줄이 없다');
  assert.ok(호출.includes('lenses.md'), '프롬프트에 lenses.md 절 위치가 없다');
  assert.ok(호출.includes('계획 파일'), '프롬프트에 계획 파일 경로가 없다');
  assert.ok(호출.includes('작업방 절대경로'), '프롬프트에 작업방 절대경로가 없다');
});

test('할 일 1 — tpx 등급표 「계획 검토」 행이 gstack 슬래시 렌즈를 부르지 않는다', () => {
  const 행 = read('.claude/skills/tpx/SKILL.md').split('\n').find((l) => l.startsWith('| 계획 검토'));
  assert.ok(행, '대조군 — 계획 검토 행이 있어야 한다');
  assert.ok(!행.includes('/plan-eng-review') && !행.includes('/plan-ceo-review'), `gstack 렌즈가 남았다: ${행}`);
  assert.ok(행.includes('공학 렌즈') && 행.includes('제품 렌즈'), `공학 · 제품 렌즈 표기가 없다: ${행}`);
});

const TR = '.claude/skills/tpx-review/SKILL.md';
const SR = '.claude/skills/spec-review/SKILL.md';

test('할 일 4 — 소절() 헬퍼가 같은 깊이 제목에서 자르고 더 깊은 제목은 넘긴다', () => {
  const 본 = 소절('## a\n### b\n본문\n#### c\n깊다\n```\n### 펜스\n```\n### d\n다음\n## e', '### b');
  assert.ok(본.includes('깊다') && 본.includes('펜스'), '더 깊은 제목이나 펜스 안에서 잘렸다');
  assert.ok(!본.includes('다음'), '같은 깊이 다음 제목을 넘어갔다');
});

test('할 일 4 — Step 2 가 code-review args 를 확인된 글자 그대로 적는다', () => {
  const 본 = 절(read(TR), '## Step 2');
  assert.ok(본.includes('| **0** |'), '대조군 — Step 2 표가 있어야 한다');
  assert.ok(본.includes('low origin/main...HEAD in <작업방 절대경로>'), '0~1등급 args 가 없다');
  assert.ok(본.includes('medium origin/main...HEAD in <작업방 절대경로>'), '2~3등급 args 가 없다');
  assert.ok(!본.includes('--max-findings'), '--max-findings 를 고정하면 한 번 준 값이 남는다');
});

test('할 일 4 — Step 3 이 세 마디를 자기 안에 적고 /tpx-plan-review 를 가리키지 않는다', () => {
  const 본 = 절(read(TR), '## Step 3');
  assert.ok(본.includes('작업 디렉터리'), '대조군 — Step 3 절이 있어야 한다');
  assert.ok(!본.includes('tpx-plan-review'), '/tpx-plan-review 를 아직 가리킨다');
  for (const 마디 of ['비대화형으로 한 번만', '고치지 말고', '질문하지 말고', '루프를 돌리지 마라']) {
    assert.ok(본.includes(마디), `"${마디}" 가 Step 3 에 없다`);
  }
});

const 재검사제목 = '## 고치고 재검사 — 바뀐 부분만';
const TPX = '.claude/skills/tpx/SKILL.md';

test('할 일 5 — tpx-review 에 「고치고 재검사」 절이 한 번 있고 비어 있지 않다', () => {
  const 글 = read(TR);
  assert.equal(글.split(재검사제목).length - 1, 1, '「고치고 재검사 — 바뀐 부분만」 절이 정확히 한 번이어야 한다');
  assert.ok(절(글, 재검사제목).length > 200, '절이 비었다');
  assert.ok(절(글, '## Step 4').length > 200, '대조군 — 다른 절을 읽을 수 있어야 한다');
});

test('할 일 5 — 범위는 앞 회차 검사 HEAD 부터의 차이와 앞 지적 목록이고 조상이 아니면 origin/main 으로 돌아간다', () => {
  const 본 = 절(read(TR), 재검사제목);
  for (const 낱말 of ['git diff <앞 회차 검사 HEAD>..HEAD', '지적 목록', 'git merge-base --is-ancestor', 'amend', 'rebase', 'origin/main...HEAD']) {
    assert.ok(본.includes(낱말), `범위 규칙 "${낱말}" 이 없다`);
  }
});

test('할 일 5 — 렌즈는 지적이 닫혔나와 같은 규칙 찾기만 하고 체크리스트 전부를 다시 돌지 않는다', () => {
  const 본 = 절(read(TR), 재검사제목);
  for (const 낱말 of ['닫혔나', '핵심 낱말', 'H2', 'H6', '체크리스트 전부']) {
    assert.ok(본.includes(낱말), `렌즈가 할 일 "${낱말}" 이 없다`);
  }
  assert.match(본, /체크리스트 전부[^\n]*(안|않)/, '체크리스트 전부를 다시 돌지 않는다는 말이 아니다');
});

test('할 일 5 — 다시 내는 렌즈는 지적을 낸 렌즈뿐이고 고친 차이에 코드가 있으면 code-review low 를 늘 낸다', () => {
  const 본 = 절(read(TR), 재검사제목);
  for (const 낱말 of ['지적을 낸 렌즈', '같은 강도', '코드', 'code-review', '`low`', '앞 회차 지적이 없었어도']) {
    assert.ok(본.includes(낱말), `렌즈 고르기 규칙 "${낱말}" 이 없다`);
  }
  assert.ok(/code-review[^\n]*origin\/main\.\.\.HEAD|origin\/main\.\.\.HEAD[^\n]*code-review/.test(본), 'code-review 범위가 origin/main...HEAD 로 적히지 않았다');
});

test('할 일 5 — 검사 묶음 · 부숴 보기는 「렌즈에 넘기는 것」을 가리키기만 한다', () => {
  const 본 = 절(read(TR), 재검사제목);
  assert.ok(본.includes('렌즈에 넘기는 것'), '정본 소절을 안 가리킨다');
  for (const 낱말 of ['check-stamp.mjs find', '임시 사본', 'RED 커밋', 'stamp=']) {
    assert.ok(!본.includes(낱말), `정본 규칙 "${낱말}" 을 옮겨 적었다`);
  }
});

test('할 일 5 — tpx 「게이트」 절이 「고치고 재검사」를 고르면 tpx-review 의 그 절로 간다고 가리킨다', () => {
  const 본 = 절(read(TPX), '## 게이트');
  assert.ok(본.includes('| 🛑 **2** 병합'), '대조군 — 게이트 표가 있어야 한다');
  assert.ok(본.includes('고치고 재검사 — 바뀐 부분만'), '새 절 제목을 안 가리킨다');
  assert.ok(본.includes('tpx-review'), 'tpx-review 를 안 가리킨다');
});

test('할 일 5 — spec-review 절차 2 가 재검사면 넘겨받은 범위 · 앞 지적만 보게 한다', () => {
  const 절차 = 절(read(SR), '## 절차');
  const 시작 = 절차.indexOf('\n2.');
  const 끝 = 절차.indexOf('\n3.');
  assert.ok(시작 >= 0 && 끝 > 시작, '대조군 — 절차 2 를 잘라야 한다');
  const 본 = 절차.slice(시작, 끝);
  for (const 낱말 of ['재검사', '넘겨받은 범위', '앞 지적', '고치고 재검사']) {
    assert.ok(본.includes(낱말), `절차 2 에 "${낱말}" 이 없다`);
  }
  assert.ok(본.includes('범위가 불분명하면 묻는다'), '기존 줄이 지워졌다');
});

test('할 일 5 — spec-review 보고 형식 머리에 검사한 HEAD 해시 줄이 있고 기존 예시 머리글은 남는다', () => {
  const 본 = 소절(read(SR), '## 보고 형식');
  assert.ok(본.includes('## 치명'), '대조군 — 코드 펜스 안 예시까지 읽어야 한다');
  assert.ok(본.includes('검사한 HEAD'), '검사한 HEAD 줄이 없다');
  assert.ok(본.indexOf('검사한 HEAD') < 본.indexOf('## 요약'), '검사한 HEAD 줄이 요약보다 뒤에 있다');
  for (const 머리 of ['## 요약', '## 치명', '## 중대', '## 통과한 항목']) {
    assert.ok(본.includes(머리), `예시 머리글 "${머리}" 이 지워졌다`);
  }
});

test('할 일 5 — 새 줄이 로컬 main 을 diff 기준으로 쓰지 않는다(조상 확인 꼴 대조군 포함)', () => {
  const 꼴 = /(?<!origin\/)\bmain\.\.\.?HEAD/;
  assert.ok(!꼴.test('git diff <앞 회차 검사 HEAD>..HEAD'), '앞 회차 범위가 로컬 main 꼴로 읽힌다');
  assert.ok(꼴.test('git diff main...HEAD'), '대조군 — 로컬 main 꼴을 잡아야 한다');
  for (const 파일 of [TR, TPX, SR]) {
    const 위반 = read(파일).split('\n').filter((l) => 꼴.test(l));
    assert.deepEqual(위반, [], `${파일} 에 로컬 main 꼴이 있다`);
  }
});

const 줄들 = (글) => 글.split('\n');

test('할 일 7 — Step 2 가 code-review 고정 args 뒤에 넘길 것을 한 줄로 가리킨다', () => {
  const 본 = 절(read(TR), '## Step 2');
  const 인덱스 = 줄들(본).findIndex((l) => l.includes('medium origin/main...HEAD in'));
  assert.ok(인덱스 >= 0, '대조군 — 2~3등급 args 줄이 있어야 한다');
  const 뒤 = 줄들(본).slice(인덱스 + 1, 인덱스 + 4).join('\n');
  assert.ok(뒤.includes('args 뒤') && 뒤.includes('렌즈에 넘기는 것'), 'args 줄 바로 뒤에 넘길 것을 정본으로 가리키는 줄이 없다');
  assert.ok(!본.includes('check-stamp.mjs find'), 'Step 2 에 정본 규칙(find)을 옮겨 적었다');
});

test('할 일 7 — 고치고 재검사 절이 기준점 없을 때 · 여러 회차 · 앞 지적 두 곳을 적는다', () => {
  const 본 = 절(read(TR), 재검사제목);
  const 기준 = 줄들(본).find((l) => l.includes('기준점이 없으면')) ?? '';
  assert.ok(기준.includes('origin/main...HEAD') && 기준.includes('0·1등급'), '기준점이 없으면 origin/main...HEAD 라는 줄이 없다');
  assert.ok(본.includes('마지막 `검사한 HEAD:` 줄'), '회차가 여럿이면 마지막 검사한 HEAD 줄이라는 말이 없다');
  const 지적 = 줄들(본).find((l) => l.includes('docs/reviews/') && l.includes('[6/7] 검사')) ?? '';
  assert.ok(지적.includes('PR'), '앞 지적을 docs/reviews/ 와 PR 의 [6/7] 검사 코멘트 둘에서 읽는다는 줄이 없다');
});

test('할 일 7 — 고치고 재검사 절의 렌즈 일 · 강도 · 범위 근거', () => {
  const 본 = 절(read(TR), 재검사제목);
  const 일 = 줄들(본).find((l) => l.includes('렌즈가 하는 일')) ?? '';
  assert.ok(일.includes('해당하는 체크리스트 항목은 다시 본다'), '고친 차이에 걸린 파일의 체크리스트 항목은 다시 본다는 말이 없다');
  assert.ok(일.includes('A~C') && 일.includes('계약') && 일.includes('경계'), 'A~C 는 계약 · 경계 파일이 있을 때만이라는 말이 없다');
  assert.ok(/체크리스트 전부[^\n]*(안|않)/.test(일), '체크리스트 전부를 다시 돌지 않는다는 기존 말이 지워졌다');
  const 렌즈 = 줄들(본).find((l) => l.includes('다시 내는 렌즈')) ?? '';
  assert.ok(렌즈.includes('지적을 낸 렌즈는 같은 강도') && 렌즈.includes('지적 없던 렌즈 중 `code-review` 만, 코드가 바뀌었으면 `low`'), '강도가 지적 낸 렌즈는 같은 강도 · 지적 없던 렌즈 중 code-review 만 코드가 바뀌었으면 low 가 아니다');
  assert.ok(본.includes('다른 범위 꼴이 먹히는지 확인하지 않았다'), 'origin/main...HEAD 근거(다른 꼴은 확인하지 않았다)가 없다');
});

test('할 일 7 — spec-review 가 재검사 회차를 tpx-review 절로 가리키고 절차 1 이 새 절의 색인 · 라우터를 본다', () => {
  const 글 = read(SR);
  const 가리킴 = '고치고 재검사 — 바뀐 부분만';
  const 참조절 = 절(글, '## 체크리스트는 references 에 있다');
  assert.ok(참조절.includes('| A. 계약 위반 |'), '대조군 — 체크리스트 절을 잘라야 한다');
  assert.ok(참조절.includes(가리킴) && 참조절.includes('tpx-review') && 참조절.includes('재검사'), '체크리스트 절이 재검사 회차를 tpx-review 절로 안 가리킨다');
  const 절차 = 절(글, '## 절차');
  const 셋째 = 절차.slice(절차.indexOf('\n3.'), 절차.indexOf('\n4.'));
  assert.ok(셋째.length > 50, '대조군 — 절차 3 을 잘라야 한다');
  assert.ok(셋째.includes(가리킴) && 셋째.includes('재검사'), '절차 3 이 재검사 회차를 tpx-review 절로 안 가리킨다');
  const 첫째 = 절차.slice(절차.indexOf('1.'), 절차.indexOf('\n2.'));
  const 새절 = 줄들(첫째).find((l) => l.includes('새 절')) ?? '';
  assert.ok(새절.includes('색인') && 새절.includes('라우터') && 새절.includes('grep -nF'), '절차 1 에 diff 의 새 절은 색인 · 라우터 표를 grep -nF 로 본다는 줄이 없다');
  assert.ok(!글.includes('check-stamp.mjs find'), 'spec-review 에 정본 규칙(find)을 옮겨 적었다');
});

test('할 일 8 — tpx 등급표 「계획 검토」 2등급 칸에 화면 렌즈가 있다', () => {
  const 행 = read(TPX).split('\n').find((l) => l.startsWith('| 계획 검토')) ?? '';
  const 칸 = 행.split('|').map((c) => c.trim());
  assert.ok(칸[4]?.includes('공학 렌즈'), `대조군 — 2등급 칸이 공학 렌즈여야 한다: ${행}`);
  assert.ok(칸[4].includes('화면 렌즈'), `2등급 칸에 화면 렌즈가 없다: ${칸[4]}`);
  assert.ok(칸[5].includes('화면 렌즈'), `대조군 — 3등급 칸에는 화면 렌즈가 있다: ${칸[5]}`);
});

test('할 일 1 — 펜스블록() 은 표지가 든 코드 펜스 하나만 돌려준다', () => {
  const 글 = '산문 Agent({\n```js\nsubagent_type: "general-purpose"\n```\n중간\n```js\nAgent({ model: "opus"\n```\n끝';
  const 본 = 펜스블록(글, 'Agent({');
  assert.ok(본.includes('model: "opus"'), '표지가 든 펜스를 못 골랐다');
  assert.ok(!본.includes('general-purpose') && !본.includes('중간') && !본.includes('산문'), '다른 펜스나 산문이 섞였다');
  assert.equal(펜스블록(글, '없는 표지'), '', '표지가 없으면 빈 글이어야 한다');
});

test('할 일 1 — 검사 도우미 사본이 세 검사 파일에 없다(정본은 md-sections.mjs)', () => {
  const 파일들 = ['review-structure.test.mjs', 'lens-handoff.test.mjs', 'agent-models.test.mjs'].filter((f) => existsSync(new URL(f, import.meta.url)));
  assert.equal(파일들.length, 3, `대조군 — 읽은 파일이 셋이어야 한다: ${파일들}`);
  for (const f of 파일들) {
    const 글 = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.ok(!/^const (절|소절|펜스안) =/m.test(글), `${f} 에 도우미 사본이 있다`);
  }
});
