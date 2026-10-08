// 가드의 금지 명령 판정. 이 검사는 **양방향**이다 —
// 막아야 할 것을 막는가, 그리고 막지 말아야 할 것을 통과시키는가.
// 안전 장치를 느슨하게 만드는 변경이라 한쪽만 보면 위험하다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fanoutVerdict, isBanned } from './guard.mjs';

test('진짜 위험한 명령을 막는다', () => {
  for (const cmd of [
    'git branch -D feature',
    'git push --force origin main',
    'git push -f origin main',
    'npm run migrate:down',
    'rm -rf /etc',
    'cd /repo && git branch -D old-branch',
    'node .claude/scripts/check-stamp.mjs put push HEAD',
    'cd x && node /abs/.claude/scripts/check-stamp.mjs put push abc',
  ]) {
    assert.ok(isBanned(cmd), `막았어야 한다: ${cmd}`);
  }
});

test('조회 명령은 통과시킨다 (2026-09-18 오탐)', () => {
  // grep 패턴 속 문자열이 실행 명령으로 오인됐다
  for (const cmd of [
    'grep -n "branch -D" .claude/scripts/guard.mjs',
    "grep -rn 'push --force' docs/",
    'echo "git branch -D 는 금지다"',
    'cat CLAUDE.md | grep "branch -D"',
    'git branch -a',
    'git branch -d merged-branch',
    'git push origin --delete old-remote',
    'git log --oneline',
    'node .claude/scripts/check-stamp.mjs run local > /tmp/c.log 2>&1',
    'node .claude/scripts/check-stamp.mjs find',
    'grep -n "check-stamp.mjs put" .claude/skills/x.md',
  ]) {
    assert.ok(!isBanned(cmd), `통과했어야 한다: ${cmd}`);
  }
});

test('따옴표를 걷어내도 실행 구간은 여전히 잡는다', () => {
  // 따옴표 제거가 과해서 진짜 명령까지 놓치면 안 된다
  assert.ok(isBanned('git branch -D "my branch"'), '따옴표 인자가 붙은 강제 삭제를 놓쳤다');
  assert.ok(isBanned("git push --force 'origin' main"), '따옴표 인자가 붙은 강제 push 를 놓쳤다');
});

test('세미콜론·파이프로 이어 붙여도 잡는다', () => {
  assert.ok(isBanned('echo hi; git branch -D foo'), '뒤 구간의 강제 삭제를 놓쳤다');
  assert.ok(isBanned('ls && git push --force'), '&& 뒤의 강제 push 를 놓쳤다');
});

test('무늬로 프로세스를 찾아 끄는 명령은 자기 셸까지 끈다 — 막는다 (2026-09-30 · 2026-10-01 두 번)', () => {
  // 명령 줄에 그 무늬가 들어 있어 도구 셸이 자기 자신을 찾아 끈다. 결과도 정리도 없이 셸이 죽는다
  for (const cmd of [
    'pkill -f "tsx apps/admin/src/app.ts"',
    'pkill -9 -f app.ts',
    'for p in $(pgrep -f "tsx apps/admin/src/app.ts"); do kill $p; done',
    'kill $(pgrep -f app.ts)',
    'kill -9 $(pgrep -af vite)',
    'pkill -fx app.ts',
    'pkill --full app.ts',
    'kill `pgrep -f app.ts`',
    'pgrep -f app.ts | xargs kill',
    'pgrep -af vite | xargs -r kill -9',
  ]) {
    assert.equal(isBanned(cmd), '무늬로 프로세스 끄기', `막았어야 한다: ${cmd}`);
  }
  for (const cmd of [
    'pgrep -af "apps/admin/src/app.ts"',
    'pgrep -af app.ts | head -3',
    'kill 12345',
    'pkill node',
    'grep -n "pkill -f" docs/SETUP.md',
    'ps aux | grep app.ts',
  ]) {
    assert.ok(!isBanned(cmd), `통과했어야 한다: ${cmd}`);
  }
});

test('막는 이유를 함께 돌려준다', () => {
  assert.equal(isBanned('git branch -D x'), '브랜치 강제 삭제');
  assert.equal(isBanned('git branch -d x'), null);
});

const 작성프롬프트 = (묶음) => `MKT 서비스의 테스트케이스 가운데 「${묶음}」 묶음을 만든다.\n\n**맡은 줄** …`;

test('케이스 작성 보조는 묶음 넷까지 — 다섯 번째 새 묶음은 거절한다 (2026-10-04 · MKT 11211 은 세 차례를 돌았다)', () => {
  const 기록 = ['장바구니', '주문', '게시판', '회원'];
  assert.ok(fanoutVerdict(기록, 작성프롬프트('관리자')).거절);
  assert.deepEqual(fanoutVerdict(기록.slice(0, 3), 작성프롬프트('회원')), { 셈: '회원' });
});

test('같은 묶음을 다시 띄우는 것은 한 번까지 — 물러서기도 그 한 번을 쓴다', () => {
  assert.deepEqual(fanoutVerdict(['주문'], 작성프롬프트('주문')), { 셈: '주문' });
  assert.ok(fanoutVerdict(['주문', '주문'], 작성프롬프트('주문')).거절);
});

test('케이스 작성 뼈대가 아닌 보조(화면 훑기 등)는 세지 않는다', () => {
  const 훑기 = 'MKT 서비스의 화면을 훑어 기록한다. 케이스는 만들지 않는다.';
  assert.deepEqual(fanoutVerdict(['a', 'b', 'c', 'd'], 훑기), { 셈: null });
});

test('fanout 모드 — 작성 자식이 아니면 세지 않고, 기록을 못 쓰면 막지 않고 지나간다', async () => {
  const { execFileSync } = await import('node:child_process');
  const 가드 = new URL('./guard.mjs', import.meta.url).pathname;
  const 입력 = JSON.stringify({ tool_input: { prompt: 작성프롬프트('주문') } });
  const 돌린다 = (env) => execFileSync('node', [가드, 'fanout'], { input: 입력, env: { PATH: process.env.PATH, ...env }, stdio: 'pipe' });
  assert.doesNotThrow(() => 돌린다({}));
  assert.doesNotThrow(() => 돌린다({ AUTHORING_GATE3_DIR: '/없는/자리' }));
});

test('fanout 모드 — 기록에 한 줄씩 덧붙이고, 다섯 번째 묶음은 exit 2 로 막는다', async () => {
  const { spawnSync } = await import('node:child_process');
  const { mkdtempSync, writeFileSync, readFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const 가드 = new URL('./guard.mjs', import.meta.url).pathname;
  const 자리 = mkdtempSync(`${tmpdir()}/fanout-`);
  writeFileSync(`${자리}/fanout.log`, 'a\nb\nc\n');
  const 띄운다 = (묶음) => spawnSync('node', [가드, 'fanout'], {
    input: JSON.stringify({ tool_input: { prompt: 작성프롬프트(묶음) } }),
    env: { PATH: process.env.PATH, AUTHORING_GATE3_DIR: 자리 },
  });
  assert.equal(띄운다('d').status, 0);
  assert.equal(readFileSync(`${자리}/fanout.log`, 'utf8'), 'a\nb\nc\nd\n');
  assert.equal(띄운다('e').status, 2);
  assert.equal(readFileSync(`${자리}/fanout.log`, 'utf8'), 'a\nb\nc\nd\n');
});

test('훅이 세는 문구가 fanout.md §4 뼈대 첫 줄과 맞는다 — 뼈대가 바뀌면 훅이 말없이 0 을 센다', async () => {
  const { readFileSync } = await import('node:fs');
  const 뼈대 = readFileSync(new URL('../skills/tpx-author/references/fanout.md', import.meta.url), 'utf8')
    .split('\n').find((줄) => 줄.includes('묶음을 만든다') && 줄.startsWith('>'));
  assert.ok(뼈대, 'fanout.md §4 뼈대 첫 줄을 못 찾았다');
  assert.deepEqual(fanoutVerdict([], 뼈대.replace('<묶음 이름>', '장바구니')), { 셈: '장바구니' });
});

test('거절 글은 남은 묶음을 자식이 직접 쓰라고 알린다', () => {
  assert.match(fanoutVerdict(['a', 'b', 'c', 'd'], 작성프롬프트('e')).거절, /직접 쓴다/);
});

test('review 모드 — 1등급만 바뀌면 조용하고, 2등급 이상은 이름을 바꿔도 경고한다 (2026-10-08)', async () => {
  const { spawnSync, execFileSync } = await import('node:child_process');
  const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const 가드 = new URL('./guard.mjs', import.meta.url).pathname;
  const 환경 = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_') && k !== 'ALLOW_PROTECTED'));
  const 만든다 = () => {
    const 뿌리 = mkdtempSync(join(tmpdir(), 'review-'));
    const git = (...a) => execFileSync('git', ['-C', 뿌리, ...a], { env: 환경, stdio: 'pipe' });
    const 쓴다 = (경로, 내용) => { mkdirSync(join(뿌리, 경로, '..'), { recursive: true }); writeFileSync(join(뿌리, 경로), 내용); };
    git('init', '-q');
    git('config', 'user.email', 't@example.com');
    git('config', 'user.name', 't');
    쓴다('apps/admin/src/execution/b.ts', 'x\n');
    git('add', '.');
    git('commit', '-qm', 'base');
    return { 뿌리, git, 쓴다 };
  };
  const 돌린다 = (뿌리) => spawnSync('node', [가드, 'review'], { input: JSON.stringify({ cwd: 뿌리 }), env: 환경, encoding: 'utf8' });

  const 하나 = 만든다();
  하나.쓴다('tests/x.spec.ts', 'y\n');
  assert.equal(돌린다(하나.뿌리).status, 0, '테스트만 고쳤는데 경고했다');

  const 둘 = 만든다();
  둘.쓴다('apps/admin/src/web/a.tsx', 'y\n');
  assert.equal(돌린다(둘.뿌리).status, 0, '화면만 고쳤는데 경고했다');

  const 셋 = 만든다();
  셋.쓴다('apps/admin/src/execution/b.ts', 'z\n');
  const 결과 = 돌린다(셋.뿌리);
  assert.equal(결과.status, 1, '2등급을 고쳤는데 경고하지 않았다');
  assert.match(결과.stderr, /오늘 SPEC 검사 기록/);

  const 넷 = 만든다();
  mkdirSync(join(넷.뿌리, 'apps/admin/src/web'), { recursive: true });
  넷.git('mv', 'apps/admin/src/execution/b.ts', 'apps/admin/src/web/b.ts');
  assert.equal(돌린다(넷.뿌리).status, 1, '이름 바꾸기로 2등급이 숨었다');

  const 다섯 = 만든다();
  다섯.쓴다('apps/admin/src/web/b.tsx', 'x\n');
  다섯.git('add', '.');
  다섯.git('commit', '-qm', 'web');
  다섯.git('mv', 'apps/admin/src/web/b.tsx', 'apps/admin/src/execution/c.ts');
  const 반대 = 돌린다(다섯.뿌리);
  assert.equal(반대.status, 1, '화면 파일을 2등급 자리로 옮겼는데 경고하지 않았다');
  assert.match(반대.stderr, /오늘 SPEC 검사 기록/);
});
