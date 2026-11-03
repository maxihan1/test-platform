// 러너 이미지가 /tests 에 붙은 케이스를 ESM 으로 읽게 두는지 본다. 컨테이너를 띄우지 않고 Dockerfile 글자만 읽는다

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const dockerfile = readFileSync(resolve(process.cwd(), 'apps/runner/Dockerfile'), 'utf8');

describe('러너 이미지', () => {
  // 실행 20980 · 20981(2026-11-03) — 위에 package.json 이 없으면 케이스가 CommonJS 로 읽혀
  // kit 의 import.meta 에서 깨지고 모든 항목이 「No tests found」로 실패했다
  it('케이스 폴더 위 맨 꼭대기에 ESM package.json 을 둔다', () => {
    const 줄 = dockerfile.split('\n').find((l) => /^RUN .*> \/package\.json$/.test(l));
    expect(줄, '/package.json 을 쓰는 RUN 줄').toBeDefined();
    const 내용 = /'(\{.*\})'/.exec(줄 ?? '')?.[1];
    expect(JSON.parse(내용 ?? 'null')).toEqual({ type: 'module' });
  });
});
