// 검사(CI)가 생성된 테스트를 정말 돌리는지, 그리고 그 단계가 병합을 막는 자리에 있는지 본다.
//
// **주석이 아니라 `run:` 만 본다.** 2026-09-21 독립 검토가 이 구멍을 잡았다 — 처음에는 글자만 찾아서
// 단계를 지우고 `# 예전에 playwright test tests/todo 를 돌렸다` 주석만 남겨도 통과했다.
// 「글자가 있다」와 「그 단계가 돈다」는 다른 주장이다.
//
// **실패를 삼키는 네 가지도 본다** — 주석만 남기기 · `continue-on-error` · `|| true` · 안 도는 `if:`.
// 넷 다 「돌긴 도는데 병합을 못 막는다」로 가는 길이라 초록불이 거짓말을 하게 된다.
//
// **이 검사가 안 보는 것** — 초록불은 안 본 것도 초록이라 적어 둔다.
//   · 케이스 안의 디바이스 선언을 안 본다. ci.yml 이 데스크톱만 돌리므로 앞으로 모바일
//     케이스가 생기면 검사가 조용히 건너뛴다. 그때는 사람이 ci.yml 을 고쳐야 한다
//   · 테스트가 실제로 통과하는지는 안 본다. 그건 ci.yml 의 그 단계가 할 일이다
//   · 면제한 폴더의 내용을 안 본다. 면제 사유가 아직 맞는지는 사람이 본다
//   · **`package.json` 의 스크립트가 실재하는지는 안 본다.** 그래서 ci.yml 의 그 줄에는
//     `--if-present` 를 안 붙였다 — 스크립트가 사라지면 CI 가 그 자리에서 죽어야 한다

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const 루트 = new URL('../../', import.meta.url);
const CI = new URL('.github/workflows/ci.yml', 루트);
const 테스트폴더 = new URL('tests/', 루트);

// 병합을 막는 필수 체크 이름이 이 잡의 이름과 묶여 있다 (docs/HOOKS.md 「CI 와 병합 차단」).
// 그래서 「단계가 있는가」만으로는 모자라고 「이 잡 안에 있는가」까지 봐야 한다.
const 막는잡 = 'check';

// 골격이 없는 저장소에서만 건너뛰라는 조건. 다른 조건이 붙으면 단계가 안 도는 길이 생긴다.
const 허용조건 = "steps.skeleton.outputs.ready == '1'";

// 면제는 여기 한 곳에만 둔다. 사유 없이 이름만 더하지 않는다.
const 면제 = new Map([
  [
    'demo',
    '일부러 실패하는 플랫폼 기능 전시물이다 — 검증 실패와 시간 초과를 보여주려고 둔 케이스가 있어 검사에서 돌리면 매번 빨갛다 (docs/spec/공통/7-데모와-완료.md)',
  ],
]);

/** 주석만 있는 줄을 지운다. 값 안의 `#` 은 건드리지 않는다. */
export function 주석뺀다(원문) {
  return 원문
    .split('\n')
    .filter((줄) => !/^\s*#/.test(줄))
    .join('\n');
}

/** 한 잡의 블록만 떼어 낸다. 다른 잡이 생겨도 섞이지 않게 들여쓰기로 끊는다. */
export function 잡블록(원문, 이름) {
  const 줄 = 원문.split('\n');
  const 머리 = new RegExp(`^ {2}["']?${이름}["']?:\\s*$`);
  const 시작 = 줄.findIndex((l) => 머리.test(l));
  if (시작 === -1) return null;
  let 끝 = 줄.length;
  for (let i = 시작 + 1; i < 줄.length; i += 1) {
    if (/^ {2}\S/.test(줄[i])) {
      끝 = i;
      break;
    }
  }
  return 줄.slice(시작, 끝).join('\n');
}

/** 잡 블록을 단계 하나하나로 자른다. `- ` 로 시작하는 줄이 새 단계다. */
export function 단계들(블록) {
  const 줄 = 블록.split('\n');
  const 결과 = [];
  let 지금 = null;
  for (const l of 줄) {
    if (/^\s*- /.test(l)) {
      if (지금) 결과.push(지금.join('\n'));
      지금 = [l];
    } else if (지금) {
      지금.push(l);
    }
  }
  if (지금) 결과.push(지금.join('\n'));
  return 결과;
}

/** 그 단계가 실제로 치는 명령. `run:` 이 없으면 빈 문자열. */
export function 치는명령(단계) {
  const 줄 = 단계.split('\n');
  // 단계의 첫 줄은 `- run: ...` 처럼 대시가 앞에 붙을 수 있다
  const 머리 = /^\s*(?:- )?run:/;
  const i = 줄.findIndex((l) => 머리.test(l));
  if (i === -1) return '';
  const 첫줄 = 줄[i].replace(/^\s*(?:- )?run:\s*/, '');
  if (첫줄 !== '|' && 첫줄 !== '>') return 첫줄;
  return 줄
    .slice(i + 1)
    .filter((l) => /^\s+\S/.test(l))
    .join('\n');
}

/**
 * `playwright test` 를 **실제로 치는** 줄에서 tests/ 아래 폴더 이름들을 뽑는다.
 * 경로를 여러 개 적을 수 있으므로 줄 안의 모든 tests/... 를 본다.
 */
export function 도는폴더(블록) {
  const 결과 = new Set();
  for (const 단계 of 단계들(블록)) {
    const 명령 = 치는명령(단계);
    if (!/playwright\s+test/.test(명령)) continue;
    for (const m of 명령.matchAll(/tests\/([^/\s'"]+)/g)) 결과.add(m[1]);
  }
  return 결과;
}

const 원문 = 주석뺀다(readFileSync(CI, 'utf8'));
const 블록 = 잡블록(원문, 막는잡);
const 실행단계 = 블록 === null ? [] : 단계들(블록).filter((s) => /playwright\s+test\s+tests\//.test(치는명령(s)));

test(`ci.yml 에 병합을 막는 잡 '${막는잡}' 이 있다`, () => {
  assert.ok(
    블록 !== null,
    `ci.yml 에 '${막는잡}' 잡이 없다. 그 이름은 main 브랜치 보호의 필수 체크 이름과 묶여 있어 바꾸면 모든 PR 이 잠긴다 (docs/HOOKS.md)`,
  );
});

test('생성된 테스트를 실행하는 단계가 있다 — 주석이 아니라 실제로 치는 명령을 본다', () => {
  assert.ok(
    실행단계.length > 0,
    `'${막는잡}' 잡에서 tests/ 를 실행하는 단계를 못 찾았다. 그 단계가 없으면 깨진 케이스가 그대로 main 에 들어간다. 주석으로 남겨 둔 것은 세지 않는다`,
  );
});

test(`그 단계가 '${막는잡}' 잡 밖에 있지 않다 — 밖이면 빨개져도 병합된다`, () => {
  const 전체 = 단계들(원문).filter((s) => /playwright\s+test\s+tests\//.test(치는명령(s))).length;
  assert.equal(
    전체,
    실행단계.length,
    `테스트 실행 단계가 '${막는잡}' 잡 밖에도 있다. 보호가 요구하는 체크 이름은 '${막는잡}' 하나뿐이라 밖에 있는 것은 빨개져도 병합을 못 막는다`,
  );
});

test('그 단계가 실패를 삼키지 않는다 — continue-on-error · || true · 안 도는 if', () => {
  for (const 단계 of 실행단계) {
    assert.doesNotMatch(
      단계,
      /continue-on-error:\s*true/,
      'continue-on-error 가 붙어 있다. 빨개져도 병합이 된다 — 검사를 통과시키려고 이걸 붙이는 것은 구멍을 다시 여는 것이다',
    );
    assert.doesNotMatch(
      치는명령(단계),
      /\|\|\s*(true|:)|;\s*true\s*$/,
      '명령이 실패를 삼킨다 (|| true 류). 빨개져도 병합이 된다',
    );
    const 조건 = /^\s*if:\s*(.+)$/m.exec(단계);
    if (조건) {
      assert.equal(
        조건[1].trim(),
        허용조건,
        `이 단계의 if 조건이 다른 단계들과 다르다. 조건이 거짓이면 그 단계는 조용히 안 돈다 — 기대한 것은 "${허용조건}" 이다`,
      );
    }
  }
});

test('이 검사 자신을 돌리는 단계가 있다 — 없으면 이 검사가 아무 데서도 안 돈다', () => {
  const 자기검사 = (블록 === null ? [] : 단계들(블록)).filter((s) => /npm run check:workflow/.test(치는명령(s)));
  assert.ok(
    자기검사.length > 0,
    'ci.yml 이 check:workflow 를 안 돈다. 그러면 지금 이 파일이 사람이 손으로 칠 때만 돌아, 안 도는 폴더가 생겨도 아무도 못 막는다',
  );
  for (const 단계 of 자기검사) {
    assert.doesNotMatch(
      치는명령(단계),
      /--if-present/,
      'check:workflow 에 --if-present 가 붙어 있다. 그 스크립트를 지우거나 이름만 바꿔도 이 단계가 아무것도 안 하고 초록이 된다 — 이 한 줄만은 없으면 죽어야 한다',
    );
  }
});

test('tests/ 아래 폴더가 전부 돌거나 사유를 달고 면제돼 있다', () => {
  const 있는것 = readdirSync(테스트폴더, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const 도는것 = 도는폴더(블록 ?? '');
  const 빠진것 = 있는것.filter((이름) => !도는것.has(이름) && !면제.has(이름));
  assert.deepEqual(
    빠진것,
    [],
    `tests/ 아래 이 폴더들이 검사에서 안 돈다: ${빠진것.join(', ')}. ci.yml 의 실행 단계에 더하거나, 이 파일의 면제 목록에 사유와 함께 적는다`,
  );
});

test('면제 목록이 낡지 않았다 — 없는 폴더를 면제해 두지 않는다', () => {
  const 있는것 = new Set(
    readdirSync(테스트폴더, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name),
  );
  for (const [이름, 사유] of 면제) {
    assert.ok(있는것.has(이름), `면제 목록의 '${이름}' 폴더가 없다. 지운 폴더면 면제도 지운다`);
    assert.ok(사유.length > 20, `'${이름}' 의 면제 사유가 너무 짧다. 왜 안 돌리는지 다음 사람이 읽고 판단할 수 있어야 한다`);
  }
});

// --- 아래는 위 판정이 기대는 순수 함수들을 따로 부러뜨려 보는 자리다 ---

test('주석만 있는 줄은 빼고, 값 안의 # 은 남긴다', () => {
  assert.equal(주석뺀다('  # 지운다\n  run: echo "# 남는다"'), '  run: echo "# 남는다"');
});

test('잡블록은 다른 잡을 섞어 오지 않고, 따옴표 친 이름도 찾는다', () => {
  const 가짜 = ['jobs:', '  check:', '    steps:', '      - run: 하나', '  다른잡:', '    steps:', '      - run: 둘'].join('\n');
  assert.match(잡블록(가짜, 'check'), /하나/);
  assert.doesNotMatch(잡블록(가짜, 'check'), /둘/);
  assert.match(잡블록(가짜.replace('  check:', '  "check":'), 'check'), /하나/);
  assert.equal(잡블록(가짜, '없는잡'), null);
});

test('치는명령은 주석을 명령으로 세지 않고, 여러 줄 명령도 읽는다', () => {
  assert.equal(치는명령('      - name: 이름만 있다'), '');
  assert.equal(치는명령('      - run: npx playwright test tests/todo'), 'npx playwright test tests/todo');
  assert.match(치는명령(['      - run: |', '          첫 줄', '          둘째 줄'].join('\n')), /둘째 줄/);
});

test('도는폴더는 실제로 치는 명령에서만 tests/ 이름을 뽑는다', () => {
  assert.deepEqual([...도는폴더('      - run: npx playwright test tests/todo --project=desktop')], ['todo']);
  assert.deepEqual([...도는폴더('      - run: npx playwright test tests/a tests/b')], ['a', 'b']);
  assert.deepEqual([...도는폴더('      - name: npx playwright test tests/todo 를 예전에 돌렸다')], []);
  assert.deepEqual([...도는폴더('      - run: npx playwright test 어딘가/다른곳')], []);
});

// ─────────────────────────────────────────────────────────────────────────────
// CI 가 DB 를 갖고 있는가 (2026-09-22 추가)
//
// **DB 검사는 DATABASE_URL 이 없으면 조용히 건너뛴다.** 그래서 CI 설정에서 그 한 줄만 빠져도
// DB 를 타는 검사 파일 전부가 안 돌고 **CI 는 초록**이다 — 「검사가 통과했다」가
// 「검사를 안 했다」의 다른 이름이 된다. 위의 playwright 그물과 같은 성질의 구멍이다.
// ─────────────────────────────────────────────────────────────────────────────

test('CI 의 check 잡이 DB 를 띄우고 DATABASE_URL 을 넘긴다', () => {
  const 블록 = 잡블록(readFileSync(CI, 'utf8'), 'check');
  assert.ok(블록, 'check 잡을 못 찾았다');
  const 주석없이 = 블록.split('\n').map((줄) => 줄.replace(/#.*$/, '')).join('\n');
  assert.match(
    주석없이,
    /services:[\s\S]*image:\s*postgres/,
    'CI 에 postgres 가 없다 — DB 검사가 통째로 건너뛰는데 초록불이 뜬다',
  );
  assert.match(
    주석없이,
    /DATABASE_URL:/,
    'DATABASE_URL 을 안 넘긴다 — DB 검사가 조용히 건너뛴다',
  );
});

test('CI 가 마이그레이션을 먹인다 — 표가 없으면 DB 검사가 죽는다', () => {
  const 블록 = 잡블록(readFileSync(CI, 'utf8'), 'check');
  assert.ok(블록);
  const 명령들 = 블록.split('\n').map((줄) => 줄.replace(/#.*$/, '')).join('\n');
  assert.match(명령들, /migrations/, '마이그레이션을 먹이는 단계가 없다');
});

// **docker-compose 가 해 주는 일을 CI 도 한다고 믿으면 안 된다.** compose 는 db/init 을
// postgres 의 초기 스크립트 자리에 마운트해 자동으로 먹이는데, CI 의 services: 컨테이너는
// 체크아웃보다 먼저 떠서 그 마운트를 못 한다. 그래서 로컬만 초록이고 CI 는
// `role "grafana_ro" does not exist` 로 죽었다 (2026-09-22 실측).
test('CI 가 db/init 을 마이그레이션보다 먼저 먹인다 — compose 가 자동으로 하던 일이다', () => {
  const 블록 = 잡블록(readFileSync(CI, 'utf8'), 'check');
  assert.ok(블록);
  const 명령들 = 블록.split('\n').map((줄) => 줄.replace(/#.*$/, '')).join('\n');
  assert.match(
    명령들,
    /db\/init/,
    'db/init 을 안 먹인다 — 마이그레이션이 role "grafana_ro" does not exist 로 죽는다',
  );
  assert.ok(
    명령들.indexOf('db/init') < 명령들.indexOf('migrations-dir'),
    'db/init 이 마이그레이션보다 뒤에 있다 — 역할이 없는 채로 GRANT 가 돌아 죽는다',
  );
});
