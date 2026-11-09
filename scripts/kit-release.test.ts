// kit 을 테스트 저장소가 받는 판으로 바꿀 때 package.json 을 맞게 만드는지 검사
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { 배포용패키지 } from './kit-release.js';

const 읽기 = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const kit = 읽기('../packages/kit/package.json');
const 루트 = 읽기('../package.json');

describe('배포용패키지 — 테스트 저장소가 받는 package.json', () => {
  it('워크스페이스의 .ts 진입점을 빌드한 dist 의 JS · 타입으로 바꾼다', () => {
    const 판 = 배포용패키지(kit, 루트, '0.1.0') as { exports: Record<string, { types: string; default: string }> };
    expect(Object.keys(판.exports)).toEqual(Object.keys(kit.exports));
    // 소스맵이 가리키는 원본이 패키지 안에 있어야 받은 kit 으로 파일 하나만 골라 돌린다
    expect(배포용패키지(kit, 루트, '0.1.0').files).toEqual(['dist', 'src']);
    expect(판.exports['.']).toEqual({ types: './dist/index.d.ts', default: './dist/index.js' });
    expect(판.exports['./scenario']).toEqual({ types: './dist/runtime/scenario.d.ts', default: './dist/runtime/scenario.js' });
  });

  it('Playwright 는 Commander 와 같은 판으로 묶고 앱 · 게임 부품은 고를 수 있게 둔다', () => {
    const 판 = 배포용패키지(kit, 루트, '0.1.0');
    const pw = 루트.devDependencies['@playwright/test'];
    expect(판.peerDependencies).toMatchObject({ '@playwright/test': pw, 'playwright-core': pw });
    expect(판.peerDependenciesMeta).toEqual({ webdriverio: { optional: true }, 'control-cli': { optional: true } });
    expect(판.dependencies).toEqual({ zod: 루트.dependencies.zod });
  });

  it('버전 꼴이 틀리거나 루트에 판이 없으면 내지 않는다', () => {
    expect(() => 배포용패키지(kit, 루트, 'v0.1.0')).toThrow('0.1.0 꼴');
    expect(() => 배포용패키지(kit, { exports: {} }, '0.1.0')).toThrow('zod');
  });
});
