// 등급 판정표의 판별식. 글로브 우선순위가 틀리면 체인 전체가 틀린 절차로 돈다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SURFACES, surfaceOf, detectTier } from './surfaces.mjs';

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
