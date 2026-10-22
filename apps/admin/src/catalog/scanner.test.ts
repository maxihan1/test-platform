// 스캐너가 코드에서 명세를 뽑아내는지, tcId 중복을 잡는지 검사한다

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { CaseSpec } from '@platform/kit';

import { caseFiles, duplicatesOf, duplicatesWith, scan } from './scanner.js';

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

  it('K2 — 옛 꼴과 FN 꼴은 같은 번호라 중복이다. UI 꼴은 따로 센다', () => {
    const found = duplicatesOf([spec('MKT-044', 'a.spec.ts'), spec('MKT-FN-044', 'b.spec.ts'), spec('MKT-UI-044', 'c.spec.ts')]);
    expect(found).toEqual([{ tcId: 'MKT-FN-044', files: ['a.spec.ts', 'b.spec.ts'] }]);
  });

  it('중복이 없으면 빈 배열이다', () => {
    expect(duplicatesOf([spec('DEMO-001', 'a.spec.ts'), spec('DEMO-002', 'b.spec.ts')])).toEqual([]);
  });
});

describe('duplicatesWith — 맡은 파일만 볼 때 K2', () => {
  let 폴더: string;

  beforeAll(async () => {
    폴더 = await mkdtemp(join(tmpdir(), 'ws-a-dupwith-'));
    await writeFile(join(폴더, 'a.spec.ts'), "export const spec = defineCase({ tcId: 'ZZW-001', name: '하나' });\n");
    await writeFile(join(폴더, 'b.spec.ts'), "export const spec = defineCase({ tcId: 'ZZW-001', name: '둘' });\n");
    await writeFile(join(폴더, 'c.spec.ts'), "export const spec = defineCase({ tcId: 'ZZW-002', name: '셋' });\n");
    await writeFile(join(폴더, 'mine.spec.ts'), "export const spec = defineCase({ tcId: 'ZZW-FN-002', name: '내 것' });\n");
  });

  afterAll(async () => {
    await rm(폴더, { recursive: true, force: true });
  });

  it('맡은 케이스가 나머지와 같은 번호면 잡고, 나머지끼리 겹친 것은 돌려주지 않는다', async () => {
    expect(await duplicatesWith([spec('ZZW-FN-002', 'mine.spec.ts')], 폴더)).toEqual([{ tcId: 'ZZW-FN-002', files: ['c.spec.ts', 'mine.spec.ts'] }]);
  });

  it('맡은 케이스끼리 겹쳐도 잡는다', async () => {
    const found = await duplicatesWith([spec('ZZW-003', 'x.spec.ts'), spec('ZZW-003', 'y.spec.ts')], 폴더);
    expect(found).toEqual([{ tcId: 'ZZW-003', files: ['x.spec.ts', 'y.spec.ts'] }]);
  });
});

describe('scan', () => {
  // 케이스 파일이 1,400개를 넘어 스캔 한 번이 혼자서도 10초쯤 걸린다. 검사마다 다시 훑으면 전체 검사 때 30초 제한을 넘는다(2026-10-12) —
  // 한 번 훑은 결과를 같이 쓰고, 그 한 번을 치르는 첫 검사만 제한을 늘린다
  let 한번: ReturnType<typeof scan> | undefined;
  const 전체스캔 = () => (한번 ??= scan());

  // 건수를 손으로 적으면 케이스를 더할 때마다 여기가 따라오지 못하고 조용히 틀려진다.
  // 폴더에 있는 파일 이름이 곧 tcId 목록이다
  it('케이스 파일을 빠짐없이 tcId 순으로 돌려준다', async () => {
    const { specs, failures, duplicates } = await 전체스캔();
    expect(failures).toEqual([]);
    expect(duplicates).toEqual([]);
    const 파일이름들 = (await caseFiles()).map((f) => basename(f, '.spec.ts')).sort();
    expect(specs.map((s) => s.tcId)).toEqual(파일이름들);
  }, 120_000);

  it('filePath는 tests 폴더 기준 상대 경로다', async () => {
    const { specs } = await 전체스캔();
    expect(specs.find((s) => s.tcId === 'DEMO-001')?.filePath).toBe('demo/DEMO-001.spec.ts');
  });

  it('zod 스키마가 JSON Schema로 변환돼 있고 describe가 라벨로 남는다', async () => {
    const { specs } = await 전체스캔();
    const four = specs.find((s) => s.tcId === 'DEMO-004');
    const properties = four?.paramSchema.properties as Record<string, { description?: string }>;
    expect(properties.resource.description).toBe('조회할 자원');
  });

  // 기대값 칸의 라벨도 케이스가 준다. 이 라벨이 실행 설정 화면의 칸 이름이 되므로
  // 길고 서술적이면 폼이 읽히지 않는다. 다국어 표로도 못 옮긴다 — 케이스 저자의 말이다
  it('기대값 칸의 describe 도 라벨로 남는다', async () => {
    const { specs } = await 전체스캔();
    const two = specs.find((s) => s.tcId === 'DEMO-002');
    const properties = two?.expectedSchema.properties as Record<string, { description?: string }>;
    expect(properties.todoCount.description).toBe('기대 할 일 개수');
  });

  it('없다고 적은 케이스는 빈 객체 스키마가 된다', async () => {
    const { specs } = await 전체스캔();
    const one = specs.find((s) => s.tcId === 'DEMO-001');
    expect(one?.paramSchema).toEqual({ type: 'object', properties: {} });
  });

  it('환경 2개를 선언한 케이스는 그대로 실려 온다', async () => {
    const { specs } = await 전체스캔();
    expect(specs.find((s) => s.tcId === 'DEMO-008')?.platforms).toEqual(['desktop', 'mobile']);
    expect(specs.find((s) => s.tcId === 'DEMO-010')?.platforms).toEqual(['mobile']);
  });

  it('파일 목록을 주면 그 파일만 읽는다', async () => {
    const { specs, failures } = await scan(깨진폴더, [join(깨진폴더, '명세없음.spec.ts')]);
    expect(specs).toEqual([]);
    expect(failures.map((f) => f.file)).toEqual(['명세없음.spec.ts']);
  });

  it('파일 하나가 깨져도 멈추지 않고 나머지까지 읽는다', async () => {
    const { specs, failures } = await scan(깨진폴더);
    expect(specs).toEqual([]);
    expect(failures.map((f) => f.file).sort()).toEqual(['명세없음.spec.ts', '문법오류.spec.ts']);
    expect(failures.find((f) => f.file === '명세없음.spec.ts')?.message).toContain('export const spec');
  });
});
