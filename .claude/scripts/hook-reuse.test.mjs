// pre-push 훅이 통과 표지를 남기고 읽어, 같은 커밋 · 기록만 더한 push 의 검사를 건너뛰는지 본다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { 깨끗한환경, 임시저장소, 저장소에서돌린다, 불린것, ZERO } from './hook-fixture.mjs';

// 훅은 현지 날짜(date +%F)로 기록 파일을 찾는다. toISOString 은 UTC 라 한국 시간 0~9시에 하루 어긋난다
const 오늘 = execFileSync('date', ['+%F'], { encoding: 'utf8' }).trim();
const 기록파일 = `docs/reviews/${오늘}-r.md`;
const 코드 = 'apps/admin/src/execution/x.ts';

const git = (저장소, ...a) => execFileSync('git', ['-C', 저장소.뿌리, ...a], { encoding: 'utf8', env: 깨끗한환경 }).trim();
const 표지 = (저장소, sha) => {
  try {
    return readFileSync(join(저장소.뿌리, '.git', 'tpx-checks', sha), 'utf8');
  } catch {
    return '';
  }
};

/** 파일을 쓰고 지운 커밋을 하나 더한다. 올릴 sha 를 담은 저장소를 돌려준다 */
function 더한다(저장소, 쓸것들, 지울것들 = []) {
  for (const [경로, 내용] of Object.entries(쓸것들)) {
    mkdirSync(join(저장소.뿌리, 경로, '..'), { recursive: true });
    writeFileSync(join(저장소.뿌리, 경로), 내용);
    git(저장소, 'add', 경로);
  }
  for (const 경로 of 지울것들) git(저장소, 'rm', '-q', 경로);
  git(저장소, 'commit', '-qm', 'next');
  return { ...저장소, sha: git(저장소, 'rev-parse', 'HEAD') };
}

/** 기록 파일을 지난 날짜로 치고 문서만 더한 커밋 — 「기록 날짜가 지났다」 흉내 */
const 문서만더하고기록지움 = (저장소) => 더한다(저장소, { 'docs/progress/x.md': 'z' }, [기록파일]);

/** 호출 기록을 비우고 훅을 돌린다 */
function 다시돌린다(저장소, 환경, 입력) {
  rmSync(저장소.기록, { force: true });
  const r = 저장소에서돌린다(저장소, 환경, 입력);
  return { ...r, 호출: 불린것(저장소.기록) };
}

/** 2등급 코드와 오늘 기록 파일을 올려 통과한 저장소 */
function 통과한저장소() {
  const 저장소 = 임시저장소([코드, 기록파일]);
  const r = 저장소에서돌린다(저장소);
  assert.equal(r.code, 0, `첫 push 가 막혔다: ${r.out}`);
  return 저장소;
}

const 정리 = (저장소) => rmSync(저장소.뿌리, { recursive: true, force: true });
const 단위테스트를돌렸다 = (호출) => /test:changed|test:always|^test\b/m.test(호출);

test('① 통과한 push 는 HEAD 에 push 표지를 남긴다', () => {
  const 저장소 = 통과한저장소();
  try {
    assert.match(표지(저장소, 저장소.sha), /^push$/m, 'push 표지가 안 남았다');
  } finally {
    정리(저장소);
  }
});

test('② 같은 커밋을 다시 push 하면 단위 테스트를 건너뛰고 통과 표지를 말한다', () => {
  const 저장소 = 통과한저장소();
  try {
    const r = 다시돌린다(저장소);
    assert.equal(r.code, 0, `재사용인데 막혔다: ${r.out}`);
    assert.match(r.out, /통과 표지/, '표지를 재사용했다는 표시가 없다');
    assert.equal(단위테스트를돌렸다(r.호출), false, `단위 테스트를 또 돌렸다: ${r.호출}`);
    assert.match(r.호출, /check:spec/);
    assert.match(r.호출, /check:docs-contract/);
  } finally {
    정리(저장소);
  }
});

test('③ 문서만 더하고 기록 파일을 지운 커밋은 문서 검사 둘만 돌고 통과한다', () => {
  const 저장소 = 문서만더하고기록지움(통과한저장소());
  try {
    const r = 다시돌린다(저장소);
    assert.equal(r.code, 0, `문서만 더했는데 막혔다: ${r.out}`);
    assert.equal(단위테스트를돌렸다(r.호출), false, `단위 테스트를 돌렸다: ${r.호출}`);
    assert.match(r.호출, /check:spec/);
    assert.match(r.호출, /check:docs-contract/);
  } finally {
    정리(저장소);
  }
});

test('④ 그 위에 코드를 더하면 다시 단위 테스트를 돌리고 기록을 요구한다', () => {
  const 저장소 = 더한다(문서만더하고기록지움(통과한저장소()), { 'apps/admin/src/execution/y.ts': 'y2' });
  try {
    const r = 다시돌린다(저장소);
    assert.equal(r.code, 1, `코드를 더했는데 통과했다: ${r.out}`);
    assert.match(r.out, /docs\/reviews/, '검사 기록을 요구하지 않았다');
    assert.match(r.호출, /^run test:changed\b/m, 'test:changed 를 안 돌렸다');
  } finally {
    정리(저장소);
  }
});

test('⑤ 표지가 local 뿐이면 단위 테스트는 건너뛰고 기록은 요구한다', () => {
  const 없음 = 임시저장소([코드]);
  const 있음 = 임시저장소([코드, 기록파일]);
  try {
    for (const 저장소 of [없음, 있음]) {
      mkdirSync(join(저장소.뿌리, '.git', 'tpx-checks'), { recursive: true });
      writeFileSync(join(저장소.뿌리, '.git', 'tpx-checks', 저장소.sha), 'local\n');
    }
    const 막힘 = 다시돌린다(없음);
    assert.equal(막힘.code, 1, `기록이 없는데 통과했다: ${막힘.out}`);
    assert.match(막힘.out, /docs\/reviews/, '검사 기록을 요구하지 않았다');
    assert.equal(단위테스트를돌렸다(막힘.호출), false, `단위 테스트를 돌렸다: ${막힘.호출}`);
    assert.doesNotMatch(막힘.호출, /check:tests/, 'check:tests 를 돌렸다');
    assert.match(막힘.호출, /check:spec/);

    const 통과 = 다시돌린다(있음);
    assert.equal(통과.code, 0, `기록이 있는데 막혔다: ${통과.out}`);
    assert.equal(단위테스트를돌렸다(통과.호출), false, `단위 테스트를 돌렸다: ${통과.호출}`);
    assert.match(표지(있음, 있음.sha), /^push$/m, '기록까지 통과했는데 push 표지가 안 남았다');
  } finally {
    정리(없음);
    정리(있음);
  }
});

test('⑥ 재사용 길에서도 check:spec 이 실패하면 막는다', () => {
  const 저장소 = 통과한저장소();
  try {
    const r = 다시돌린다(저장소, { NPM_FAIL: 'check:spec' });
    assert.equal(r.code, 1, `check:spec 이 실패했는데 통과했다: ${r.out}`);
  } finally {
    정리(저장소);
  }
});

test('⑦ HEAD 가 아닌 커밋을 올리면 그 커밋에 표지가 안 남는다', () => {
  const 첫 = 임시저장소([코드, 기록파일]);
  const 저장소 = 더한다(첫, { 'apps/admin/src/execution/y.ts': 'y2' });
  try {
    const r = 저장소에서돌린다({ ...저장소, sha: 첫.sha });
    assert.equal(r.code, 0, `막혔다: ${r.out}`);
    assert.match(r.out, /HEAD 가 아니다/, '표지를 안 남긴 이유를 말하지 않았다');
    assert.equal(표지(저장소, 첫.sha), '', 'HEAD 가 아닌 커밋에 표지가 남았다');
    assert.equal(existsSync(join(저장소.뿌리, '.git', 'tpx-checks', 저장소.sha)), false, 'HEAD 에도 표지가 남았다');
  } finally {
    정리(저장소);
  }
});

test('⑧ HEAD 에 push 표지가 있어도 stdin 이 비면 기록을 요구한다', () => {
  const 저장소 = 문서만더하고기록지움(통과한저장소());
  try {
    const r = 다시돌린다(저장소, {}, '');
    assert.equal(r.code, 1, `빈 입력인데 표지를 믿고 통과했다: ${r.out}`);
    assert.match(r.out, /docs\/reviews/, '검사 기록을 요구하지 않았다');
    assert.match(r.호출, /^run test:changed\b/m, '단위 테스트를 건너뛰었다');
  } finally {
    정리(저장소);
  }
});

test('⑨ 화면만 바뀐 커밋은 검사 기록 없이 통과하고 1등급을 말한다', () => {
  const 저장소 = 임시저장소(['apps/admin/src/web/x.tsx']);
  try {
    const r = 다시돌린다(저장소);
    assert.equal(r.code, 0, `화면만 바꿨는데 막혔다: ${r.out}`);
    assert.match(r.out, /1등급/, '기록을 요구하지 않는다고 말하지 않았다');
    assert.doesNotMatch(r.out, /docs\/reviews/);
    assert.match(r.호출, /^run test:changed\b/m, '단위 테스트는 돌아야 한다');
    assert.match(표지(저장소, 저장소.sha), /^push$/m, '통과했는데 push 표지가 안 남았다');
  } finally {
    정리(저장소);
  }
});

test('⑩ 스킬만 바뀐 커밋도 통과한다', () => {
  const 저장소 = 임시저장소(['.claude/skills/x/SKILL.md']);
  try {
    const r = 다시돌린다(저장소);
    assert.equal(r.code, 0, `스킬만 바꿨는데 막혔다: ${r.out}`);
    assert.match(r.out, /1등급/);
  } finally {
    정리(저장소);
  }
});

test('⑪ 미분류 코드는 여전히 검사 기록을 요구한다', () => {
  const 저장소 = 임시저장소(['apps/x.ts']);
  try {
    const r = 다시돌린다(저장소);
    assert.equal(r.code, 1, `기록 없이 통과했다: ${r.out}`);
    assert.match(r.out, /docs\/reviews/);
  } finally {
    정리(저장소);
  }
});

test('⑫ 두 ref 중 하나의 diff 가 실패하면 다른 ref 가 화면뿐이어도 기록을 요구한다', () => {
  const 저장소 = 임시저장소(['apps/admin/src/web/x.tsx']);
  try {
    const 입력 = `refs/heads/a ${저장소.sha} refs/heads/a ${ZERO}\nrefs/heads/b ${'1'.repeat(40)} refs/heads/b ${ZERO}\n`;
    const r = 다시돌린다(저장소, {}, 입력);
    assert.equal(r.code, 1, `읽지 못한 ref 가 있는데 기록 없이 통과했다: ${r.out}`);
    assert.match(r.out, /docs\/reviews/);
  } finally {
    정리(저장소);
  }
});
