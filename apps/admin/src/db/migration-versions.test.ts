// 마이그레이션 번호가 겹치지 않는지 본다 — 병렬 PR 이 같은 날 같은 번호를 골라 한쪽이 안 돌 뻔했다(2026-09-28 두 번)

import { readdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const 파일들 = readdirSync(new URL('../../../../db/migrations', import.meta.url)).filter((f) => f.endsWith('.sql'));

describe('마이그레이션 번호', () => {
  it('파일 이름이 <14자리 번호>_<이름>.sql 이다', () => {
    expect(파일들.filter((f) => !/^\d{14}_[a-z0-9_]+\.sql$/.test(f))).toEqual([]);
  });

  it('번호가 겹치지 않는다 — dbmate 는 번호로 가려 겹친 한쪽을 안 돌린다', () => {
    const 번호들 = 파일들.map((f) => f.slice(0, 14));
    expect(번호들.filter((n, i) => 번호들.indexOf(n) !== i)).toEqual([]);
  });
});
