// pre-push 훅의 계약. 훅은 **실패가 아니라 침묵으로** 건너뛰므로 기계가 봐야 한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HOOK, ZERO, 깨끗한환경, 임시저장소, 저장소에서돌린다, 불린것 } from './hook-fixture.mjs';

const SHA = 'a'.repeat(40);

// git 저장소가 아닌 빈 폴더 + 가짜 npm 에서 돌린다. 진짜 저장소에서 돌리면 「검사 시작」 뒤에 진짜 단위 테스트가
// 끝까지 돌아 수 분이 걸린다 (2026-10-08 CI 492초 중 491초). 이 검사들이 보는 것은 「검사 시작」 글자와 종료 코드뿐이다
/** 훅을 stdin 입력과 함께 돌리고 종료 코드와 출력을 돌려준다 */
function run(stdin) {
  const 뿌리 = mkdtempSync(join(tmpdir(), 'pre-push-run-'));
  const 가짜 = join(뿌리, '.fakebin');
  const 기록 = join(뿌리, '.npm-calls');
  mkdirSync(가짜);
  writeFileSync(join(가짜, 'npm'), `#!/bin/sh\necho "$*" >> "${기록}"\n`);
  chmodSync(join(가짜, 'npm'), 0o755);
  const 호출 = () => {
    try {
      return readFileSync(기록, 'utf8');
    } catch {
      return '';
    }
  };
  try {
    const out = execFileSync(HOOK, ['origin', 'https://example.com/r.git'], {
      cwd: 뿌리, env: { ...깨끗한환경, PATH: `${가짜}:${process.env.PATH}` },
      input: stdin, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { code: 0, out, 호출: 호출() };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}`, 호출: 호출() };
  } finally {
    rmSync(뿌리, { recursive: true, force: true });
  }
}

test('훅 파일이 실재하고 실행 비트가 있다', () => {
  // git 은 실행 비트 없는 훅을 조용히 건너뛴다
  const m = statSync(HOOK).mode;
  assert.ok(m & 0o111, 'pre-push 에 실행 비트가 없다');
});

test('삭제 push 는 검사 없이 통과한다', () => {
  // 삭제는 로컬 sha 가 전부 0 이다. 코드를 안 올리므로 검사할 것이 없다
  const r = run(`(delete) ${ZERO} refs/heads/old ${SHA}\n`);
  assert.equal(r.code, 0, `삭제 push 가 막혔다: ${r.out}`);
  assert.doesNotMatch(r.out, /검사 시작/, '삭제인데 검사를 돌렸다');
  assert.match(r.out, /삭제/, '삭제로 판정했다는 표시가 없다');
});

test('삭제가 여러 건이어도 통과한다', () => {
  const r = run(`(delete) ${ZERO} refs/heads/a ${SHA}\n(delete) ${ZERO} refs/heads/b ${SHA}\n`);
  assert.equal(r.code, 0, `여러 건 삭제가 막혔다: ${r.out}`);
});

test('삭제와 코드 push 가 섞이면 검사로 간다', () => {
  // 한 줄이라도 진짜 push 면 검사해야 한다
  const r = run(`(delete) ${ZERO} refs/heads/a ${SHA}\nrefs/heads/b ${SHA} refs/heads/b ${ZERO}\n`);
  assert.match(r.out, /검사 시작/, '섞였는데 건너뛰었다');
  assert.doesNotMatch(r.out, /Test Files/, '진짜 저장소에서 단위 테스트를 돌렸다');
});

test('입력이 비면 검사로 간다 (보수적)', () => {
  // 빈 입력을 삭제로 보면 검사가 새어 나간다
  const r = run('');
  assert.match(r.out, /검사 시작/, '빈 입력을 삭제로 봤다');
  assert.doesNotMatch(r.out, /Test Files/, '진짜 저장소에서 단위 테스트를 돌렸다');
});

test('stdin 을 두 번 읽지 않는다고 적어 뒀다', () => {
  // 읽는 순간 소모된다. 다음 사람이 또 읽으려다 깨뜨리지 않게
  const src = readFileSync(HOOK, 'utf8');
  assert.match(src, /stdin/, 'stdin 을 다루는 주석이 없다');
});

test('기존 검사가 그대로 있다', () => {
  const src = readFileSync(HOOK, 'utf8');
  for (const 검사 of ['npm test', 'check:tests', 'typecheck']) {
    assert.ok(src.includes(검사), `기존 검사가 사라졌다: ${검사}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 차선별 동작. **글자가 아니라 실제 동작을 본다** — 임시 git 저장소에 커밋을 만들고 훅을 그 안에서 돌린다.
// npm 은 PATH 앞에 끼운 가짜로 바꿔 불린 인자만 적는다. 진짜 npm test 를 돌리면 이 검사가 수 분 걸린다.
// ─────────────────────────────────────────────────────────────────────────────

test('테스트만 바뀐 커밋은 cases 차선 — 타입·check:tests 만 돌고 통과한다', () => {
  const 저장소 = 임시저장소(['tests/todo/TODO-002.spec.ts', 'docs/cases/TODO.md']);
  try {
    const r = 저장소에서돌린다(저장소);
    assert.equal(r.code, 0, `cases 차선인데 막혔다: ${r.out}`);
    assert.match(r.out, /차선: cases/, 'cases 차선으로 판정하지 않았다');
    const 호출 = 불린것(저장소.기록);
    assert.match(호출, /typecheck/, '가벼운 길에서 타입 검사를 안 돌렸다');
    assert.match(호출, /check:tests/, '가벼운 길에서 check:tests 를 안 돌렸다');
    // 가벼운 길의 유일한 규칙 검사다 — 스크립트가 사라지면 조용히 초록이 아니라 그 자리에서 죽어야 한다
    assert.doesNotMatch(호출, /check:tests.*--if-present/, '가벼운 길의 check:tests 에 --if-present 가 붙어 있다');
    assert.doesNotMatch(호출, /--no-held/, '초안 push 에는 보류 케이스가 정상인데 막는다 — 막기는 /tpx 병합 직전이다 (K13)');
    assert.doesNotMatch(호출, /^test\b/m, '가벼운 길인데 전체 단위 테스트를 돌렸다');
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});

// git 은 훅을 돌릴 때 GIT_DIR 등을 넣는다. 그대로 검사에 물려주면 임시 저장소를 만드는 검사가 이 저장소를 친다 —
// 2026-09-24 · 09-25 두 번 브랜치에 커밋하고 core.bare=true 를 박았다. 훅이 검사 전에 걷는다
test('훅은 검사를 부르기 전에 GIT_* 환경 변수를 걷는다', () => {
  const 저장소 = 임시저장소(['tests/todo/TODO-002.spec.ts']);
  try {
    const r = 저장소에서돌린다(저장소, { GIT_DIR: join(저장소.뿌리, '.git'), GIT_INDEX_FILE: join(저장소.뿌리, '.git', 'index') });
    assert.equal(r.code, 0, `막혔다: ${r.out}`);
    assert.match(불린것(저장소.기록), /check:tests/, '검사가 불리지 않았다');
    assert.equal(불린것(`${저장소.기록}.git-env`), '', 'npm 이 GIT_* 를 물려받았다');
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});

// 무거운 길(full 차선)은 바뀐 것과 이어진 검사(test:changed)와 늘 도는 검사(test:always)를 돈다
const 바뀐것만돌았다 = (호출) =>
  /^run test:changed\b.*origin\/main/m.test(호출) && /^run test:always\b/m.test(호출);

test('코드가 섞인 커밋은 무거운 길 — 타입 검사 · 바뀐 것과 이어진 테스트 · check:tests 를 돌고 통과한다', () => {
  const 저장소 = 임시저장소(['tests/todo/TODO-002.spec.ts', 'apps/x.ts']);
  try {
    const r = 저장소에서돌린다(저장소);
    assert.equal(r.code, 0, `막혔다: ${r.out}`);
    const 호출 = 불린것(저장소.기록);
    assert.ok(바뀐것만돌았다(호출), `무거운 길인데 test:changed · test:always 를 안 돌렸다: ${호출}`);
    assert.match(호출, /typecheck/, '사람 PR 에는 CI 가 없는데 타입 검사를 안 돌렸다');
    assert.match(호출, /check:tests/, 'check:tests 를 안 돌렸다');
    assert.doesNotMatch(호출, /check:workflow/, '하네스를 안 바꿨는데 하네스 검사를 돌렸다');
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});

// 작성 에이전트 PR 의 CI 에만 있던 목록 대조 둘 — 사람 PR 에는 CI 가 없어 여기서 안 돌면 어디서도 안 돈다 (리뷰 M2)
test('무거운 길은 비밀값 이름 · 증적 형식 목록 대조도 돌고, 실패하면 막는다', () => {
  for (const 실패 of ['', 'check:secret-names', 'check:evidence-formats']) {
    const 저장소 = 임시저장소(['apps/admin/src/web/X.tsx']);
    try {
      const r = 저장소에서돌린다(저장소, 실패 ? { NPM_FAIL: 실패 } : {});
      assert.equal(r.code, 실패 ? 1 : 0, `${실패 || '모두 통과'}인데 종료 ${r.code}: ${r.out}`);
      if (실패) continue;
      const 호출 = 불린것(저장소.기록);
      assert.match(호출, /^run check:secret-names\b/m, '비밀값 이름 목록 대조를 안 돌렸다');
      assert.match(호출, /^run check:evidence-formats\b/m, '증적 형식 목록 대조를 안 돌렸다');
    } finally {
      rmSync(저장소.뿌리, { recursive: true, force: true });
    }
  }
});

// 검사는 디스크를 읽는다 — 차선은 올리는 sha 로 골랐어도 디스크가 그 커밋과 다르면 초록이 올라가는 코드를 말하지 않는다 (리뷰 L1)
test('커밋 안 한 새 파일 · 고친 파일이 있거나 올리는 커밋이 HEAD 가 아니면 검사 전에 막는다', () => {
  for (const 꼴 of ['새 파일', '고친 파일', '다른 커밋']) {
    const 저장소 = 임시저장소(['apps/admin/src/web/X.tsx']);
    try {
      if (꼴 === '새 파일') writeFileSync(join(저장소.뿌리, 'apps/admin/src/web/Y.tsx'), 'z');
      if (꼴 === '고친 파일') writeFileSync(join(저장소.뿌리, 'apps/admin/src/web/X.tsx'), 'z');
      if (꼴 === '다른 커밋') execFileSync('git', ['-C', 저장소.뿌리, 'checkout', '-q', '-b', 'other', 'HEAD~1'], { env: 깨끗한환경 });
      const r = 저장소에서돌린다(저장소);
      assert.equal(r.code, 1, `${꼴} — 디스크가 올리는 커밋과 다른데 통과했다: ${r.out}`);
      assert.match(r.out, 꼴 === '다른 커밋' ? /HEAD/ : /커밋 안 한/, `${꼴} — 왜 막았는지 안 알렸다: ${r.out}`);
      assert.equal(불린것(저장소.기록), '', `${꼴} — 막기 전에 검사를 돌렸다`);
    } finally {
      rmSync(저장소.뿌리, { recursive: true, force: true });
    }
  }
});

// db/init 이 `.sql` 에서 `.sh` 로 바뀐 뒤 `*.sql` 만 보던 훅이 아무것도 못 잡아 조용히 건너뛰었다.
// 비밀번호는 박아 쓰면 맥이 옛 비밀번호에 묶인다 — docker compose 와 같은 `.env` 를 읽는다 (FIX-F1-02 에서 넘김)
// 포트도 같다 — 박아 쓰면 compose 가 .env 대로 다른 포트에 띄웠을 때 막힌다 (2026-10-27 5433 → 5434)
test('임시 DB 에 db/init 의 .sh · .sql 을 그 DB 이름으로 걸고, 비밀번호 · 포트는 .env 에서 읽는다 — 비우면 platform · grafana_ro · 5434', () => {
  const 초기화 = '#!/bin/bash\npsql -h "$PGHOST" -p "$PGPORT" --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -v pw="$GRAFANA_RO_PASSWORD"\n';
  for (const env of ['', 'POSTGRES_PASSWORD=s3cret\nGRAFANA_RO_PASSWORD="ro9"\n', 'export POSTGRES_PASSWORD=s3cret  # 맥 개발용\r\nGRAFANA_RO_PASSWORD=\'ro9\'\r\nPOSTGRES_PORT="5499"\r\n']) {
    const 저장소 = 임시저장소(['apps/admin/src/execution/x.ts', ['db/init/01-ro.sh', 초기화], ['db/init/02-x.sql', 'SELECT 1;']]);
    try {
      if (env) writeFileSync(join(저장소.뿌리, '.env'), env);
      const r = 저장소에서돌린다(저장소);
      assert.equal(r.code, 0, `막혔다: ${r.out}`);
      const db = 불린것(저장소.DB기록);
      const 이름 = /CREATE DATABASE (tp_prepush_\w+)/.exec(db)?.[1];
      const [pw, ro] = env ? ['s3cret', 'ro9'] : ['platform', 'grafana_ro'];
      const 포트 = env.includes('POSTGRES_PORT') ? '5499' : '5434';
      assert.match(db, new RegExp(`psql -h 127\\.0\\.0\\.1 -p ${포트} --username platform --dbname ${이름} -v pw=${ro} pw=${pw}`), `.sh 를 임시 DB 에 안 걸었다: ${db}`);
      assert.match(db, new RegExp(`psql .*-d ${이름} .*-f db/init/02-x\\.sql pw=${pw}`), `.sql 을 임시 DB 에 안 걸었다: ${db}`);
      assert.match(db, new RegExp(`docker run .*platform:${pw}@host\\.docker\\.internal:${포트}/${이름}`), `마이그레이션이 .env 비밀번호를 안 썼다: ${db}`);
      assert.match(불린것(`${저장소.기록}.db`), new RegExp(`platform:${pw}@127\\.0\\.0\\.1:${포트}/${이름}`), '검사가 .env 비밀번호 · 포트를 안 받았다');
    } finally {
      rmSync(저장소.뿌리, { recursive: true, force: true });
    }
  }
});

test('지금 꺼낸 커밋에 단 주석 태그를 같이 올리면 태그가 가리키는 커밋으로 견준다', () => {
  const 저장소 = 임시저장소(['apps/admin/src/web/X.tsx']);
  try {
    execFileSync('git', ['-C', 저장소.뿌리, 'tag', '-a', 'v1', '-m', 'v1'], { env: 깨끗한환경 });
    const 태그 = execFileSync('git', ['-C', 저장소.뿌리, 'rev-parse', 'v1'], { encoding: 'utf8', env: 깨끗한환경 }).trim();
    const 입력 = `refs/heads/b ${저장소.sha} refs/heads/b ${ZERO}\nrefs/tags/v1 ${태그} refs/tags/v1 ${ZERO}\n`;
    const r = 저장소에서돌린다(저장소, {}, 입력);
    assert.equal(r.code, 0, `HEAD 에 단 태그인데 막혔다: ${r.out}`);
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});

test('db/init 스크립트가 실패하면 막는다 — 건너뛰면 grafana_ro 권한을 보는 검사가 거짓 초록이다', () => {
  const 저장소 = 임시저장소(['apps/admin/src/execution/x.ts', ['db/init/02-x.sql', 'SELECT 1;']]);
  try {
    const r = 저장소에서돌린다(저장소, { DB_FAIL: '-f db/init/02-x.sql' });
    assert.equal(r.code, 1, `초기화가 실패했는데 통과했다: ${r.out}`);
    assert.match(r.out, /db\/init\/02-x\.sql/, '어느 파일이 실패했는지 안 알렸다');
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});

// 사람 PR 에 CI 가 없어 DB 검사는 여기서만 돈다 (2026-10-09 사용자) — 개발 postgres 에 임시 DB 를 만들고 지운다
test('서버 코드가 바뀐 커밋은 임시 DB 를 만들어 검사에 넘기고 끝나면 지운다', () => {
  const 저장소 = 임시저장소(['apps/admin/src/execution/x.ts']);
  try {
    const r = 저장소에서돌린다(저장소);
    assert.equal(r.code, 0, `막혔다: ${r.out}`);
    const db = 불린것(저장소.DB기록);
    const 이름 = /CREATE DATABASE (tp_prepush_\w+)/.exec(db)?.[1];
    assert.ok(이름, `임시 DB 를 안 만들었다: ${db}`);
    assert.match(db, /docker run .*dbmate.*up/, '마이그레이션을 안 걸었다');
    assert.match(db, new RegExp(`DROP DATABASE IF EXISTS ${이름}`), '임시 DB 를 안 지웠다');
    assert.match(불린것(`${저장소.기록}.db`), new RegExp(`127\\.0\\.0\\.1:5434/${이름}`), '검사가 임시 DB 주소를 못 받았다');
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});

test('전체를 다시 도는 설정 파일이 바뀌어도 임시 DB 를 만든다', () => {
  for (const 파일 of ['vitest.config.ts', 'package.json', 'db/migrations/20990101000000_x.sql']) {
    const 저장소 = 임시저장소([파일]);
    try {
      저장소에서돌린다(저장소);
      assert.match(불린것(저장소.DB기록), /CREATE DATABASE tp_prepush_/, `${파일} 을 바꿨는데 DB 를 안 만들었다`);
    } finally {
      rmSync(저장소.뿌리, { recursive: true, force: true });
    }
  }
});

test('검사가 실패해도 임시 DB 는 지운다', () => {
  const 저장소 = 임시저장소(['apps/admin/src/execution/x.ts']);
  try {
    const r = 저장소에서돌린다(저장소, { NPM_FAIL: 'test:changed' });
    assert.equal(r.code, 1);
    assert.match(불린것(저장소.DB기록), /DROP DATABASE IF EXISTS tp_prepush_/, '실패 뒤 임시 DB 가 남았다');
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});

test('개발 DB 에 못 붙으면 막고 도커를 켜라고 알린다 — 조용히 DB 검사를 건너뛰지 않는다', () => {
  const 저장소 = 임시저장소(['apps/admin/src/execution/x.ts']);
  try {
    const r = 저장소에서돌린다(저장소, { DB_FAIL: 'CREATE DATABASE' });
    assert.equal(r.code, 1, `DB 없이 통과했다: ${r.out}`);
    assert.match(r.out, /도커/, '무엇을 하라는지 안 알렸다');
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});

test('화면 · 하네스만 바뀐 커밋은 임시 DB 를 안 만든다', () => {
  for (const 파일 of ['apps/admin/src/web/X.tsx', '.claude/scripts/x.mjs']) {
    const 저장소 = 임시저장소([파일]);
    try {
      저장소에서돌린다(저장소);
      assert.equal(불린것(저장소.DB기록), '', `${파일} 만 바꿨는데 DB 를 만들었다`);
    } finally {
      rmSync(저장소.뿌리, { recursive: true, force: true });
    }
  }
});

test('하네스(.claude/)가 바뀐 커밋은 하네스 검사도 돌고, 실패하면 막는다', () => {
  for (const 실패 of ['', 'check:workflow']) {
    const 저장소 = 임시저장소(['.claude/scripts/x.mjs']);
    try {
      const r = 저장소에서돌린다(저장소, 실패 ? { NPM_FAIL: 실패 } : {});
      assert.match(불린것(저장소.기록), /check:workflow/, '하네스를 바꿨는데 하네스 검사를 안 돌렸다');
      assert.equal(r.code, 실패 ? 1 : 0, `하네스 검사 ${실패 ? '실패' : '통과'}인데 종료 ${r.code}: ${r.out}`);
    } finally {
      rmSync(저장소.뿌리, { recursive: true, force: true });
    }
  }
});

test('타입 검사가 실패하면 막는다', () => {
  const 저장소 = 임시저장소(['apps/x.ts']);
  try {
    assert.equal(저장소에서돌린다(저장소, { NPM_FAIL: 'typecheck' }).code, 1);
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});

test('코드 파일을 spec 으로 옮긴 커밋은 무거운 길 — 이름 바꾸기로 지운 쪽 경로가 숨지 않는다', () => {
  // git diff 는 기본으로 rename 을 감지해 새 경로만 낸다. 그러면 apps/x.ts 가 사라진 것이 판정에 안 보인다
  const 저장소 = 임시저장소([], [['apps/x.ts', 'tests/todo/x.spec.ts']]);
  try {
    const r = 저장소에서돌린다(저장소);
    assert.doesNotMatch(r.out, /차선: cases/, `코드를 spec 으로 옮겼는데 cases 차선으로 갔다: ${r.out}`);
    assert.ok(바뀐것만돌았다(불린것(저장소.기록)), '무거운 길인데 test:changed · test:always 를 안 돌렸다');
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});

test('migration 이 바뀐 커밋은 전체 단위 테스트 — 작업방 경로(.claude/)에서는 vitest 트리거가 안 걸린다', () => {
  const 저장소 = 임시저장소(['db/migrations/20990101000000_x.sql']);
  try {
    저장소에서돌린다(저장소);
    assert.match(불린것(저장소.기록), /^test\b/m, 'migration 을 바꿨는데 전체 단위 테스트를 안 돌렸다');
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});

test('문서만 바뀐 커밋은 docs 차선 — check:spec 만 돌고 통과한다', () => {
  const 저장소 = 임시저장소(['docs/SETUP.md']);
  try {
    const r = 저장소에서돌린다(저장소);
    assert.equal(r.code, 0, `문서만 바꿨는데 막혔다: ${r.out}`);
    const 호출 = 불린것(저장소.기록);
    assert.match(호출, /check:spec/, 'docs 차선에서 check:spec 을 안 돌렸다');
    assert.doesNotMatch(호출, /^(test|run test|run typecheck)/m, `docs 차선인데 테스트·타입 검사를 돌렸다: ${호출}`);
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});

test('docs 차선에서 check:spec 이 실패하면 push 를 막는다', () => {
  const 저장소 = 임시저장소(['docs/SETUP.md']);
  try {
    const r = 저장소에서돌린다(저장소, { NPM_FAIL: 'check:spec' });
    assert.equal(r.code, 1, `check:spec 이 실패했는데 통과했다: ${r.out}`);
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});

test('명세가 바뀐 커밋은 spec 차선 — check:spec 만 돌고 통과한다', () => {
  const 저장소 = 임시저장소(['docs/spec/도메인/x.md']);
  try {
    const r = 저장소에서돌린다(저장소);
    assert.equal(r.code, 0, `명세를 바꿨는데 막혔다: ${r.out}`);
    const 호출 = 불린것(저장소.기록);
    assert.match(호출, /check:spec/, 'spec 차선에서 check:spec 을 안 돌렸다');
    assert.doesNotMatch(호출, /^(test|run test)/m, `spec 차선인데 테스트를 돌렸다: ${호출}`);
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});

test('바뀐 파일이 0 인 커밋(빈 시작 커밋)은 검사 없이 통과한다 — LEARNINGS 09-23 · 09-24', () => {
  const 저장소 = 임시저장소([]);
  try {
    const r = 저장소에서돌린다(저장소);
    assert.equal(r.code, 0, `빈 커밋이 막혔다: ${r.out}`);
    assert.equal(불린것(저장소.기록), '', '빈 커밋인데 npm 을 불렀다');
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});

test('판정 규칙을 훅에 복사하지 않고 lane.mjs 에 맡긴다', () => {
  assert.match(readFileSync(HOOK, 'utf8'), /lane\.mjs/);
});

test('삭제 줄과 문서만 바꾼 커밋 ref 를 함께 올리면 docs 차선으로 통과한다', () => {
  const 저장소 = 임시저장소(['docs/SETUP.md']);
  try {
    const 입력 = `(delete) ${ZERO} refs/heads/old ${SHA}\nrefs/heads/b ${저장소.sha} refs/heads/b ${ZERO}\n`;
    const r = 저장소에서돌린다(저장소, {}, 입력);
    assert.equal(r.code, 0, `삭제 줄이 섞여 막혔다: ${r.out}`);
    assert.match(r.out, /차선: docs/, `삭제 줄이 섞여 docs 차선이 아니다: ${r.out}`);
    assert.doesNotMatch(불린것(저장소.기록), /^(test|run test|run typecheck)/m, '삭제 줄이 섞여 테스트를 돌렸다');
  } finally {
    rmSync(저장소.뿌리, { recursive: true, force: true });
  }
});
