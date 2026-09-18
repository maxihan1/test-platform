// 등급 판정표의 판별식. 글로브 우선순위가 틀리면 체인 전체가 틀린 절차로 돈다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SURFACES, surfaceOf, detectTier } from './surfaces.mjs';

const DETECT = fileURLToPath(new URL('./detect-tier.mjs', import.meta.url));

test('표가 비어 있지 않다 (공허한 통과 방지)', () => {
  assert.ok(SURFACES.length >= 10, `표면이 ${SURFACES.length}개뿐이다`);
  for (const s of SURFACES) {
    assert.ok(s.globs.length > 0, `${s.name} 에 글로브가 없다`);
    assert.ok([0, 1, 2, 3].includes(s.tier), `${s.name} 등급이 ${s.tier}`);
  }
});

test('문서는 0등급', () => {
  assert.equal(detectTier(['docs/SETUP.md']).tier, 0);
  assert.equal(surfaceOf('docs/SETUP.md').name, 'DOC');
});

test('명세는 3등급 — docs/** 보다 먼저 걸린다', () => {
  assert.equal(surfaceOf('docs/spec/도메인/러너.md').name, 'SPEC');
  assert.equal(detectTier(['docs/spec/도메인/러너.md']).tier, 3);
  assert.equal(surfaceOf('docs/SPEC.md').name, 'SPEC');
});

test('스킬과 CLAUDE.md 는 1등급', () => {
  assert.equal(surfaceOf('.claude/skills/spec-review/SKILL.md').name, 'HARNESS');
  assert.equal(detectTier(['.claude/skills/spec-review/SKILL.md']).tier, 1);
  assert.equal(surfaceOf('CLAUDE.md').name, 'HARNESS');
});

test('마이그레이션과 공유 타입은 3등급', () => {
  assert.equal(detectTier(['db/migrations/20260916000001_init.sql']).tier, 3);
  assert.equal(detectTier(['packages/kit/src/types.ts']).tier, 3);
});

test('git 훅은 2등급 — 안전 장치다 (2026-09-18 미분류였다)', () => {
  assert.equal(surfaceOf('.claude/hooks/pre-push')?.name, 'GUARD');
  assert.equal(detectTier(['.claude/hooks/pre-push']).tier, 2);
  assert.deepEqual(detectTier(['.claude/hooks/pre-push']).unmapped, []);
});

test('서버 본체와 러너는 2등급', () => {
  assert.equal(detectTier(['apps/admin/src/catalog/store.ts']).tier, 2);
  assert.equal(detectTier(['apps/runner/src/execute.ts']).tier, 2);
  assert.equal(detectTier(['apps/admin/src/auth/gate.ts']).tier, 2);
});

test('화면은 1등급', () => {
  assert.equal(detectTier(['apps/admin/src/web/pages/list.tsx']).tier, 1);
});

test('규칙 ① — 섞이면 가장 높은 등급', () => {
  const v = detectTier(['docs/SETUP.md', 'db/migrations/x.sql', 'apps/admin/src/web/a.tsx']);
  assert.equal(v.tier, 3);
  assert.deepEqual(v.surfaces.sort(), ['DOC', 'MIGRATION', 'WEB']);
});

test('규칙 ④ — 테스트만 바뀌면 등급이 안 올라간다', () => {
  // 2등급 폴더 안의 테스트 파일이지만 TESTS 가 먼저 걸려 1등급이다
  assert.equal(surfaceOf('apps/admin/src/catalog/store.test.ts').name, 'TESTS');
  assert.equal(detectTier(['apps/admin/src/catalog/store.test.ts']).tier, 1);
  // 소스가 함께 바뀌면 소스 표면이 기준
  assert.equal(detectTier(['apps/admin/src/catalog/store.test.ts', 'apps/admin/src/catalog/store.ts']).tier, 2);
});

test('규칙 ③ — 미분류는 1등급으로 두되 드러낸다', () => {
  const v = detectTier(['어디에도/없는/경로.xyz']);
  assert.equal(v.tier, 1);
  assert.deepEqual(v.unmapped, ['어디에도/없는/경로.xyz']);
});

test('규칙 ② — 신호가 없으면 1등급', () => {
  assert.equal(detectTier([]).tier, 1);
});

test('`**` 는 경로 조각 0개에도 걸린다', () => {
  assert.equal(surfaceOf('tests/demo.spec.ts').name, 'TESTS');
  assert.equal(surfaceOf('apps/runner/Dockerfile').name, 'COMPOSE');
});

// 2026-09-18 실측 — git 이 한글 경로를 8진 이스케이프로 감싸 내보낸다 (core.quotepath 기본값).
// 풀지 않으면 SPEC 12장(전부 한글 경로)이 미분류로 새어 3등급이 2등급으로 내려간다.
// detect-tier.mjs 가 스스로 푼다 — 부르는 쪽이 깃발을 외우게 하지 않는다
test('git 이 이스케이프한 한글 경로도 표면을 찾는다', () => {
  const 이스케이프 = '"docs/spec/\\352\\263\\265\\355\\206\\265/2-\\353\\252\\205\\354\\204\\270\\354\\204\\240\\354\\226\\270.md"';
  const 나온것 = execFileSync('node', [DETECT, 이스케이프], { encoding: 'utf8' });
  assert.match(나온것, /등급: 3/, '이스케이프된 SPEC 경로가 3등급으로 안 잡힌다');
  assert.match(나온것, /표면: SPEC/, '표면이 SPEC 이 아니다');
  assert.doesNotMatch(나온것, /미분류/, '미분류로 샌다');
});

test('안 깨진 경로도 그대로 돈다 (위 검사의 대조군)', () => {
  const 나온것 = execFileSync('node', [DETECT, 'docs/spec/공통/2-명세선언.md'], { encoding: 'utf8' });
  assert.match(나온것, /등급: 3/);
  assert.doesNotMatch(나온것, /미분류/);
});
