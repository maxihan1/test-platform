// 스캐너가 코드에서 명세를 뽑아내는지, tcId 중복을 잡는지 검사한다

import { describe, expect, it } from 'vitest';

import type { CaseSpec } from '@platform/kit';

import { caseFiles, duplicateOf, scan } from './scanner.js';

function spec(tcId: string, filePath: string): CaseSpec {
  return {
    tcId,
    name: '이름',
    platforms: ['desktop'],
    precondition: [],
    paramSchema: { type: 'object', properties: {} },
    expectedSchema: { type: 'object', properties: {} },
    filePath,
  };
}

describe('caseFiles', () => {
  it('tests 폴더의 케이스 파일을 전부 찾는다', async () => {
    const files = await caseFiles();
    expect(files.filter((f) => f.endsWith('.spec.ts'))).toHaveLength(files.length);
    expect(files.length).toBeGreaterThanOrEqual(10);
  });

  it('찾은 경로는 정렬돼 있다', async () => {
    const files = await caseFiles();
    expect(files).toEqual([...files].sort());
  });
});

describe('duplicateOf', () => {
  it('같은 tcId가 두 파일에 있으면 양쪽 경로를 돌려준다', () => {
    const found = duplicateOf([spec('DEMO-001', 'a/one.spec.ts'), spec('DEMO-001', 'b/two.spec.ts')]);
    expect(found).toEqual({ tcId: 'DEMO-001', files: ['a/one.spec.ts', 'b/two.spec.ts'] });
  });

  it('중복이 없으면 null이다', () => {
    expect(duplicateOf([spec('DEMO-001', 'a.spec.ts'), spec('DEMO-002', 'b.spec.ts')])).toBeNull();
  });
});

describe('scan', () => {
  it('데모 케이스 10건을 tcId 순으로 돌려준다', async () => {
    const specs = await scan();
    expect(specs.map((s) => s.tcId)).toEqual([
      'DEMO-001', 'DEMO-002', 'DEMO-003', 'DEMO-004', 'DEMO-005',
      'DEMO-006', 'DEMO-007', 'DEMO-008', 'DEMO-009', 'DEMO-010',
    ]);
  });

  it('filePath는 tests 폴더 기준 상대 경로다', async () => {
    const specs = await scan();
    expect(specs[0].filePath).toBe('demo/DEMO-001.spec.ts');
  });

  it('zod 스키마가 JSON Schema로 변환돼 있고 describe가 라벨로 남는다', async () => {
    const specs = await scan();
    const four = specs.find((s) => s.tcId === 'DEMO-004');
    const properties = four?.paramSchema.properties as Record<string, { description?: string }>;
    expect(properties.resource.description).toBe('조회할 자원');
  });

  it('없다고 적은 케이스는 빈 객체 스키마가 된다', async () => {
    const specs = await scan();
    const one = specs.find((s) => s.tcId === 'DEMO-001');
    expect(one?.paramSchema).toEqual({ type: 'object', properties: {} });
  });

  it('환경 2개를 선언한 케이스는 그대로 실려 온다', async () => {
    const specs = await scan();
    expect(specs.find((s) => s.tcId === 'DEMO-008')?.platforms).toEqual(['desktop', 'mobile']);
    expect(specs.find((s) => s.tcId === 'DEMO-010')?.platforms).toEqual(['mobile']);
  });
});
