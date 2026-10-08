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

test('할 일 1 — spec-review G 체크리스트의 G3 줄 · 접두사 정본 줄이 apps/admin/CLAUDE.md 를 가리킨다', () => {
  const 줄들 = read('.claude/skills/spec-review/references/checklist-g-h.md').split('\n');
  for (const 표지 of ['G3는 1회로 본다', '접두사의 정본은']) {
    const 줄 = 줄들.find((l) => l.includes(표지));
    assert.ok(줄, `대조군 — "${표지}" 줄이 실제로 있어야 한다`);
    assert.ok(줄.includes('apps/admin/CLAUDE.md'), `"${표지}" 줄이 apps/admin/CLAUDE.md 를 안 가리킨다`);
    assert.doesNotMatch(줄, 맨CLAUDE, `"${표지}" 줄이 옛 루트 CLAUDE.md 를 아직 가리킨다`);
  }
});

test('할 일 1 — SETUP 의 fixture 줄이 apps/admin/CLAUDE.md 를 가리킨다', () => {
  const 줄 = read('docs/SETUP.md').split('\n').find((l) => l.includes('검사 전에 치운다'));
  assert.ok(줄, '대조군 — 찾는 줄이 실제로 있어야 한다');
  assert.ok(줄.includes('apps/admin/CLAUDE.md'), 'apps/admin/CLAUDE.md 를 안 가리킨다');
  assert.doesNotMatch(줄, 맨CLAUDE, '옛 루트 CLAUDE.md 를 아직 가리킨다');
});

// `## 제목` 부터 같은 깊이 이하의 다음 제목 전까지를 잘라 온다 (코드 펜스 안의 `#` 줄은 제목이 아니다)
const 절 = (text, 제목) => {
  const 시작 = text.indexOf(제목);
  assert.ok(시작 >= 0, `대조군 — "${제목}" 절이 있어야 한다`);
  const 깊이 = 제목.match(/^#+/)[0].length;
  const 제목줄 = new RegExp(`^#{1,${깊이}} `);
  const 모은 = [];
  let 펜스 = false;
  for (const 줄 of text.slice(시작 + 제목.length).split('\n')) {
    if (/^```/.test(줄)) 펜스 = !펜스;
    if (!펜스 && 제목줄.test(줄)) break;
    모은.push(줄);
  }
  return 모은.join('\n');
};

test('게이트 2 7 — 절() 헬퍼가 코드 펜스 안의 # 줄에서 자르지 않는다', () => {
  const 글 = '## a\n```\n# 펜스 안\n```\n본문\n## b\n다음';
  const 본 = 절(글, '## a');
  assert.ok(본.includes('본문'), '펜스 안 # 줄에서 잘렸다');
  assert.ok(!본.includes('다음'), '다음 제목을 넘어갔다');
});

test('할 일 2 — tpx 선행 읽기가 본문 대신 위치와 절 제목을 넘긴다', () => {
  const 본 = 절(read('.claude/skills/tpx/SKILL.md'), '## 선행 읽기 — 여기서 한 번만 읽는다');
  assert.ok(본.includes('`파일:줄`'), '파일:줄 을 넘긴다는 말이 없다');
  assert.ok(본.includes('절 제목'), '절 제목을 함께 넘긴다는 말이 없다');
  assert.match(본, /grep -nF[^\n]*위치를 다시 잡/, '받는 쪽이 절 제목을 grep -nF 로 찾아 위치를 다시 잡는다는 말이 없다');
  assert.ok(본.includes('줄 범위'), '줄 범위만 연다는 말이 없다');
  assert.match(본, /progress[^\n]*마지막 항목/, 'progress 는 마지막 항목을 읽는다는 말이 없다');
  assert.ok(본.includes('아직 열린 미완'), '앞 항목에 남은 아직 열린 미완도 읽는다는 말이 없다');
  assert.doesNotMatch(본, /마지막 항목 하나만/, '옛 「마지막 항목 하나만」이 남았다');
  assert.doesNotMatch(본, /본문을 붙여 보낸다/, '옛 「본문을 붙여 보낸다」가 남았다');
});

test('할 일 2 — tpx-impl 이 계획 파일 경로 + 할 일 번호를 구현자와 검증자에게 넘긴다', () => {
  const 본 = read('.claude/skills/tpx-impl/SKILL.md');
  const 구현 = 절(본, '### 2-A. 구현자 병렬 발행');
  const 검증 = 절(본, '### 2-C. 계획 대조 검증');
  assert.ok(구현.includes('계획 파일 경로 + 할 일 번호'), '2-A 가 계획 경로 + 할 일 번호를 안 넘긴다');
  assert.ok(검증.includes('계획 파일 경로 + 할 일 번호'), '2-C 가 계획 경로 + 할 일 번호를 안 넘긴다');
  assert.doesNotMatch(본, /선행 읽기 본문을 인라인으로 붙인다/, '옛 인라인 붙이기가 남았다');
});

test('할 일 2 — tpx-impl 선행 읽기가 위치 넘기기이고 CLAUDE.md §3 을 싣지 않는다', () => {
  const 본 = 절(read('.claude/skills/tpx-impl/SKILL.md'), '## 선행 읽기');
  assert.ok(본.includes('파일:줄') && 본.includes('절 제목'), '위치와 절 제목을 넘긴다는 말이 없다');
  assert.doesNotMatch(본, /CLAUDE\.md §3/, '보조 에이전트가 루트 CLAUDE.md 를 받으므로 §3 은 싣지 않는다');
});

test('할 일 2 — tpx-review 선행 읽기가 렌즈에 위치를 넘긴다', () => {
  const 본 = 절(read('.claude/skills/tpx-review/SKILL.md'), '## 선행 읽기');
  assert.ok(본.includes('파일:줄') && 본.includes('절 제목'), '렌즈에 위치와 절 제목을 넘긴다는 말이 없다');
  assert.doesNotMatch(본, /사본을 렌즈 프롬프트에 붙인다/, '옛 사본 붙이기가 남았다');
});

test('할 일 2 — tpx-spec Step 1 이 장 안에서 절 단위로 읽고, 1000줄 엣지는 없다', () => {
  const 스킬 = read('.claude/skills/tpx-spec/SKILL.md');
  const 본 = 절(스킬, '## Step 1. 읽을 장을 좁힌다');
  assert.ok(본.includes('절 단위'), '장 안에서 절 단위로 읽는다는 말이 없다');
  assert.match(본, /읽은 절[^\n]*줄 수/, 'PR 코멘트에 읽은 절 · 줄 수를 적는다는 말이 없다');
  assert.doesNotMatch(스킬, /1000줄/, '옛 「1000줄」 엣지가 남았다');
});

test('할 일 2 — tpx-impl · tpx-review 는 위치만 넘겨도 환경 값을 프롬프트에 그대로 싣는다', () => {
  for (const s of ['tpx-impl', 'tpx-review']) {
    const 본 = 절(read(`.claude/skills/${s}/SKILL.md`), '## 선행 읽기');
    assert.ok(본.includes('환경 값'), `${s} 에 환경 값 문장이 없다`);
    assert.ok(본.includes('DATABASE_URL') && 본.includes('작업방 절대경로'), `${s} 가 DATABASE_URL · 작업방 절대경로를 안 든다`);
    assert.match(본, /그대로 (싣|넣)/, `${s} 가 환경 값을 그대로 싣는다고 안 적었다`);
  }
});

test('할 일 2 — 에이전트 정의는 프롬프트와 그것이 가리킨 줄을 정본으로 본다', () => {
  for (const f of ['tpx-implementer', 'tpx-verifier']) {
    const 본 = read(`.claude/agents/${f}.md`);
    assert.ok(본.includes('프롬프트와 그것이 가리킨 줄이 정본'), `${f} 가 위치 넘기기에 맞게 안 고쳐졌다`);
  }
});

test('할 일 3 — spec-review 절차 1 이 LEARNINGS 를 헤딩으로 골라 부분 읽기하고 CLAUDE.md 를 다시 읽지 않는다', () => {
  const 본 = 절(read('.claude/skills/spec-review/SKILL.md'), '## 절차');
  const 첫째 = 본.slice(본.indexOf('1.'), 본.indexOf('\n2.'));
  assert.ok(첫째.includes('docs/LEARNINGS.md'), '대조군 — 절차 1 에 LEARNINGS 가 있어야 한다');
  assert.ok(첫째.includes("grep -n '^## '"), "LEARNINGS 헤딩을 grep -n '^## ' 로 뽑는다는 말이 없다");
  assert.ok(첫째.includes('키워드'), '검사 범위 키워드와 맞는 항목을 고른다는 말이 없다');
  assert.ok(첫째.includes('최근 5건'), '최근 5건을 읽는다는 말이 없다');
  assert.ok(첫째.includes('부분 읽기'), '부분 읽기라는 말이 없다');
  assert.ok(첫째.includes('재발 여부를 반드시 확인한다'), '과거 위반 재발 확인이 빠졌다');
  assert.ok(첫째.includes('docs/spec/` 아래 장을 전부 읽는다'), '전체 범위 검사의 장 전부 읽기가 빠졌다');
  assert.doesNotMatch(첫째, /`CLAUDE\.md`[^\n]*읽는다/, '이미 실린 CLAUDE.md 를 다시 읽으라는 말이 남았다');
});

test('할 일 4 — ponytail 규칙은 코드를 쓰는 보조 에이전트에만 자동으로 붙는다', () => {
  const 값 = JSON.parse(read('.claude/settings.json')).env?.PONYTAIL_SUBAGENT_MATCHER;
  assert.ok(값, 'settings.json env.PONYTAIL_SUBAGENT_MATCHER 가 없다');
  const 정규식 = new RegExp(값, 'i');
  for (const 맞음 of ['tpx-implementer', 'author-write']) assert.ok(정규식.test(맞음), `${맞음} 에 규칙이 안 붙는다`);
  assert.equal(값, '^(tpx-implementer|author-write)$', '앞뒤를 고정한 정규식이어야 한다');
  for (const 안맞음 of ['tpx-verifier', 'general-purpose', 'Explore', 'author-scan', 'tpx-implementer-x', 'my-author-write']) {
    assert.ok(!정규식.test(안맞음), `${안맞음} 에도 규칙이 붙는다`);
  }
});

test('할 일 4 — tpx-impl 2-A 의 보안 줄과 대체 구현자 줄이 프롬프트 첫 줄에서 ponytail 스킬을 부르게 한다', () => {
  const 글 = 절(read('.claude/skills/tpx-impl/SKILL.md'), '### 2-A.');
  const 줄들 = 글.split('\n');
  const 보안 = 줄들.findIndex((l) => l.includes('보안 · 비밀값 · 권한을 고치는 할 일만'));
  const 대체 = 줄들.findIndex((l) => l.includes('정의를 못 찾으면'));
  assert.ok(보안 >= 0 && 대체 >= 0, '대조군 — 보안 줄과 대체 구현자 줄이 2-A 에 있어야 한다');
  for (const [이름, 시작] of [['보안', 보안], ['대체 구현자', 대체]]) {
    assert.ok(줄들.slice(시작, 시작 + 3).join('\n').includes('ponytail:ponytail'), `${이름} 줄 근처에 ponytail:ponytail 이 없다`);
  }
  assert.ok(글.split('ponytail:ponytail').length - 1 >= 2, 'ponytail:ponytail 이 두 번 이상 나와야 한다');
});

test('게이트 2 1 — tpx-impl 2-A 「반드시 넣을 것」 목록에 환경 값과 절대경로가 있다', () => {
  const 글 = 절(read('.claude/skills/tpx-impl/SKILL.md'), '### 2-A.');
  const 시작 = 글.indexOf('프롬프트에 반드시 넣을 것');
  assert.ok(시작 >= 0, '대조군 — 「반드시 넣을 것」 목록이 있어야 한다');
  const 목록 = 글.slice(시작).split('\n\n')[0];
  assert.ok(목록.includes('DATABASE_URL'), '목록에 검사용 DATABASE_URL 이 없다');
  assert.ok(목록.includes('절대경로'), '목록에 작업방 절대경로가 없다');
});

test('게이트 2 2 — spec-review 절차 1 이 렌즈로 불리면 넘겨받은 위치를 연다', () => {
  const 본 = 절(read('.claude/skills/spec-review/SKILL.md'), '## 절차');
  const 첫째 = 본.slice(본.indexOf('1.'), 본.indexOf('\n2.'));
  assert.ok(첫째.includes('넘겨받은 위치'), '렌즈로 불리면 넘겨받은 위치를 연다는 말이 없다');
  assert.ok(첫째.includes('위치 없음'), '직접 부르면(위치 없음) 어떻게 하는지 말이 없다');
  assert.ok(첫째.includes('docs/spec/` 아래 장을 전부 읽는다'), '전체 범위 검사 줄이 빠졌다');
});

test('게이트 2 3 — 절 제목 찾기는 고정 문자열 grep -nF 다', () => {
  for (const [파일, 제목] of [
    ['tpx', '## 선행 읽기 — 여기서 한 번만 읽는다'],
    ['tpx-impl', '## 선행 읽기'],
    ['tpx-review', '## 선행 읽기'],
  ]) {
    const 본 = 절(read(`.claude/skills/${파일}/SKILL.md`), 제목);
    assert.ok(본.includes('grep -nF'), `${파일} 선행 읽기가 grep -nF 를 안 쓴다`);
  }
});

test('게이트 2 4 — WORKFLOW 세션 이어받기 첫 프롬프트가 LEARNINGS 를 부분 읽기하고 CLAUDE.md 는 뺀다', () => {
  const 줄 = read('docs/WORKFLOW.md').split('\n').find((l) => l.includes('WS-<X>가 읽을 장만 읽어줘'));
  assert.ok(줄, '대조군 — 첫 프롬프트 줄이 있어야 한다');
  assert.ok(줄.includes("grep -n '^## '"), 'LEARNINGS 를 헤딩 grep 으로 부분 읽기한다는 말이 없다');
  assert.ok(줄.includes('최근 5건'), '최근 5건이 없다');
  assert.doesNotMatch(줄, /CLAUDE\.md, /, '자동으로 실리는 CLAUDE.md 를 또 읽으라고 한다');
});

test('게이트 2 5 — tpx-spec 선행 읽기에 「넘겨받은 위치만 연다」가 없다 (스스로 장을 고르는 단계)', () => {
  const 본 = 절(read('.claude/skills/tpx-spec/SKILL.md'), '## 선행 읽기');
  assert.ok(본.includes('재로드 금지'), '대조군 — 재로드 금지 문장은 남아야 한다');
  assert.doesNotMatch(본, /넘겨받은 위치/, 'Step 1 과 어긋나는 「넘겨받은 위치」가 남았다');
});

test('게이트 2 6 — tpx-impl 2-A 두 문장이 tpx-implementer · author-write 에만 붙는다고 적는다', () => {
  const 줄들 = 절(read('.claude/skills/tpx-impl/SKILL.md'), '### 2-A.').split('\n').filter((l) => l.includes('ponytail 규칙은') || l.includes('규칙이') && l.includes('자동으로 붙는다'));
  assert.ok(줄들.length >= 2, '대조군 — ponytail 자동 부착 문장이 둘 있어야 한다');
  for (const 줄 of 줄들) assert.match(줄, /tpx-implementer`? · `?author-write/, `"tpx-implementer · author-write" 가 빠졌다: ${줄.trim()}`);
});

test('게이트 2 9 — apps/admin/CLAUDE.md 머리에 기존 규칙 수정 · 삭제는 승인이라는 한 줄이 있다', () => {
  const 머리 = read('apps/admin/CLAUDE.md').split('\n').slice(0, 8).join('\n');
  assert.match(머리, /기존 규칙 수정 · 삭제는[^\n]*§2\.5[^\n]*승인/, '머리에 수정 · 삭제 승인 줄이 없다');
  assert.ok(머리.includes('새 접두사 추가는 직접'), '새 접두사 추가는 직접이라는 말이 없다');
});
