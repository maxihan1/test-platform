// 스캐너가 코드에서 명세를 뽑아내는지, tcId 중복을 잡는지 검사한다

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { CaseSpec } from '@platform/kit';

import { caseFiles, duplicatesOf, scan } from './scanner.js';

let 깨진폴더: string;

beforeAll(async () => {
  // 같은 워커에서 앞서 돈 테스트가 이 값을 바꿔 두면 엉뚱한 폴더를 훑는다. 스스로 고정한다
  process.env.PLATFORM_TESTS_DIR = resolve(process.cwd(), 'tests');

  깨진폴더 = await mkdtemp(join(tmpdir(), 'ws-a-scan-'));
  await writeFile(join(깨진폴더, '명세없음.spec.ts'), 'export const notSpec = 1;\n');
  await writeFile(join(깨진폴더, '문법오류.spec.ts'), 'export const spec = defineCase({\n');
});

afterAll(async () => {
  await rm(깨진폴더, { recursive: true, force: true });
});

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

describe('duplicatesOf', () => {
  it('같은 tcId가 두 파일에 있으면 양쪽 경로를 돌려준다', () => {
    const found = duplicatesOf([spec('DEMO-001', 'a/one.spec.ts'), spec('DEMO-001', 'b/two.spec.ts')]);
    expect(found).toEqual([{ tcId: 'DEMO-001', files: ['a/one.spec.ts', 'b/two.spec.ts'] }]);
  });

  it('겹친 쌍이 둘이면 둘 다 돌려준다', () => {
    const found = duplicatesOf([
      spec('DEMO-001', 'a.spec.ts'),
      spec('DEMO-001', 'b.spec.ts'),
      spec('DEMO-002', 'c.spec.ts'),
      spec('DEMO-002', 'd.spec.ts'),
    ]);
    expect(found.map((d) => d.tcId)).toEqual(['DEMO-001', 'DEMO-002']);
  });

  it('중복이 없으면 빈 배열이다', () => {
    expect(duplicatesOf([spec('DEMO-001', 'a.spec.ts'), spec('DEMO-002', 'b.spec.ts')])).toEqual([]);
  });
});

describe('scan', () => {
  // 건수를 손으로 적으면 케이스를 더할 때마다 여기가 따라오지 못하고 조용히 틀려진다.
  // 폴더에 있는 파일 이름이 곧 tcId 목록이다
  it('케이스 파일을 빠짐없이 tcId 순으로 돌려준다', async () => {
    const { specs, failures, duplicates } = await scan();
    expect(failures).toEqual([]);
    expect(duplicates).toEqual([]);
    const 파일이름들 = (await caseFiles()).map((f) => basename(f, '.spec.ts')).sort();
    expect(specs.map((s) => s.tcId)).toEqual(파일이름들);
  });

  it('filePath는 tests 폴더 기준 상대 경로다', async () => {
    const { specs } = await scan();
    expect(specs[0].filePath).toBe('demo/DEMO-001.spec.ts');
  });

  it('zod 스키마가 JSON Schema로 변환돼 있고 describe가 라벨로 남는다', async () => {
    const { specs } = await scan();
    const four = specs.find((s) => s.tcId === 'DEMO-004');
    const properties = four?.paramSchema.properties as Record<string, { description?: string }>;
    expect(properties.resource.description).toBe('조회할 자원');
  });

  it('없다고 적은 케이스는 빈 객체 스키마가 된다', async () => {
    const { specs } = await scan();
    const one = specs.find((s) => s.tcId === 'DEMO-001');
    expect(one?.paramSchema).toEqual({ type: 'object', properties: {} });
  });

  it('환경 2개를 선언한 케이스는 그대로 실려 온다', async () => {
    const { specs } = await scan();
    expect(specs.find((s) => s.tcId === 'DEMO-008')?.platforms).toEqual(['desktop', 'mobile']);
    expect(specs.find((s) => s.tcId === 'DEMO-010')?.platforms).toEqual(['mobile']);
  });

  it('파일 하나가 깨져도 멈추지 않고 나머지까지 읽는다', async () => {
    const { specs, failures } = await scan(깨진폴더);
    expect(specs).toEqual([]);
    expect(failures.map((f) => f.file).sort()).toEqual(['명세없음.spec.ts', '문법오류.spec.ts']);
    expect(failures.find((f) => f.file === '명세없음.spec.ts')?.message).toContain('export const spec');
  });
});
