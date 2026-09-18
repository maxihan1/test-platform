// 선언된 의존성이 실제로 불러와지는지 보는 검사의 판별식.
// 워크트리에는 자기 node_modules 가 없고 Node 가 상위로 올라가 루트 것을 쓴다.
// 디렉터리 존재로 판정하면 그 자리에서 거짓 양성이 난다 (계획 검토 BLOCKER 1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { missingDeps, declaredDeps } from './check-deps.mjs';

test('선언 목록을 dependencies 와 devDependencies 양쪽에서 모은다', () => {
  const names = declaredDeps();
  assert.ok(names.includes('fastify'), 'dependencies 를 못 읽었다');
  assert.ok(names.includes('vitest'), 'devDependencies 를 못 읽었다');
});

test('실제로 설치된 것은 누락으로 세지 않는다', () => {
  assert.deepEqual(missingDeps(['fastify', 'zod']), []);
});

test('없는 것만 골라 낸다', () => {
  assert.deepEqual(missingDeps(['fastify', '@없는/패키지-xyz']), ['@없는/패키지-xyz']);
});

test('워크트리에서도 상위 node_modules 를 찾는다 (BLOCKER 1)', () => {
  // 이 파일이 도는 위치에 node_modules 가 없어도 통과해야 한다.
  // 디렉터리 존재로 판정하면 여기서 깨진다
  assert.deepEqual(missingDeps(declaredDeps()), [], '선언된 것 중 안 잡히는 게 있다 — npm install 을 돌려라');
});

test('npm 스크립트에 배선돼 있다', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.ok(pkg.scripts['check:deps'], 'package.json 에 check:deps 가 없다');
});
