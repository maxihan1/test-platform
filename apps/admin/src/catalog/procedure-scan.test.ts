// 프로시저 파일 스캔 — 파일 하나에서 케이스 여럿을 읽고, defineProcedure 가 던진 어긋남은 defineCase 가 던질 때처럼 읽기 실패(check:tests 의 K8)로 남는다

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 구간, 선언, 절차, 프로시저글 } from './procedure-fixture.js';
import { duplicatesWith, scan, type ScanResult } from './scanner.js';
import { 화면지도줄들 } from './screenMap.js';
import { 단계제목들 } from './stepTitles.js';

const 가져오기 = "import { 글쓰기화면 } from './pages/compose.page.js';\n";
const 선언들 =
  선언('본문없음', 'XQ-FN-101').replace('precondition: [],', "precondition: ['글쓰기 권한이 있다'],") +
  선언('글자수초과', 'XQ-FN-102', "\n  held: '보류 — 값을 정해야 한다',") +
  선언('게시확인', 'XQ-FN-103');
const 본문 =
  `  const 글쓰기 = new 글쓰기화면(driver);\n` +
  절차('글쓰기 화면을 연다', ' await 글쓰기.연다(); ') +
  구간('본문없음', '본문을 비운다') +
  절차('사진을 고른다') +
  구간('글자수초과', '본문에 501자를 넣는다') +
  구간('게시확인', '타임라인을 연다');
const 옛꼴 = (tcId: string, platforms: string): string => `import { defineCase, test, verify } from '@platform/kit';
export const spec = defineCase({ tcId: '${tcId}', name: '옛 꼴', platforms: ${platforms}, precondition: [], params: null, expected: null });
test(spec, async () => {
  await test.step('연다', async () => { await verify('맞다', true, true); });
});
`;

describe('프로시저 파일 스캔', () => {
  let 뿌리 = '';
  let 결과: ScanResult;
  const 앞뿌리 = process.env.PLATFORM_TESTS_DIR;

  beforeAll(async () => {
    // @platform/kit 을 찾도록 저장소 안에 두고, kit 이 filePath 를 이 뿌리 기준으로 만들게 한다
    뿌리 = await mkdtemp(join(import.meta.dirname, '.proc-scan-'));
    process.env.PLATFORM_TESTS_DIR = 뿌리;
    await mkdir(join(뿌리, 'xq', 'pages'), { recursive: true });
    await writeFile(join(뿌리, 'xq', 'pages', 'compose.page.ts'), "export class 글쓰기화면 {\n  static readonly 주소 = 'app:compose';\n  constructor(readonly driver: unknown) {}\n}\n");
    await writeFile(join(뿌리, 'xq', 'XQ-TP-001.spec.ts'), 프로시저글(본문, { 가져오기, 선언들 }));
    await writeFile(join(뿌리, 'xq', 'XQ-001.spec.ts'), 옛꼴('XQ-001', "['android']"));
    await writeFile(join(뿌리, 'xq', 'XQ-002.spec.ts'), 옛꼴('XQ-002', "['android', 'desktop']"));
    const 한건 = 구간('본문없음', '하나');
    await writeFile(join(뿌리, 'xq', 'XQ-TP-002.spec.ts'), 프로시저글(한건, { procId: 'XQ-TP-002', 선언들: 선언('본문없음', 'XQ-FN-201', '\n  keepAppData: true,'), cases: '[본문없음]' }));
    await writeFile(join(뿌리, 'xq', 'XQ-TP-003.spec.ts'), 프로시저글(한건, { procId: 'XQ-TP-003', 선언들: 선언('본문없음', 'XQ-FN-301').replace("['android']", "['windows']"), cases: '[본문없음]' }));
    await writeFile(join(뿌리, 'xq', 'XQ-TP-004.spec.ts'), 프로시저글(한건, { procId: 'XQ-TP-004', 선언들: 선언('본문없음', 'XQ-GS-401'), cases: '[본문없음]' }));
    결과 = await scan(뿌리);
  });

  afterAll(async () => {
    if (앞뿌리 === undefined) delete process.env.PLATFORM_TESTS_DIR;
    else process.env.PLATFORM_TESTS_DIR = 앞뿌리;
    await rm(뿌리, { recursive: true, force: true });
  });

  it('프로시저 파일 하나에서 케이스 여럿을 읽는다 — 번호 · 차례는 kit 이 실은 그대로이고 이름을 같이 든다', () => {
    const 읽은 = 결과.specs.filter((s) => s.filePath === join('xq', 'XQ-TP-001.spec.ts'));
    expect(읽은.map((s) => [s.tcId, s.procId, s.procSeq, s.procName])).toEqual([
      ['XQ-FN-101', 'XQ-TP-001', 1, '글쓰기 — 입력 제한부터 게시까지'],
      ['XQ-FN-102', 'XQ-TP-001', 2, '글쓰기 — 입력 제한부터 게시까지'],
      ['XQ-FN-103', 'XQ-TP-001', 3, '글쓰기 — 입력 제한부터 게시까지'],
    ]);
    expect(읽은[1]!.held).toBe('보류 — 값을 정해야 한다');
  });

  it('프로시저의 사전조건을 케이스 사전조건 앞에 붙인다', () => {
    const 사전 = Object.fromEntries(결과.specs.map((s) => [s.tcId, s.precondition]));
    expect(사전['XQ-FN-101']).toEqual(['일반 회원으로 로그인해 있다', '글쓰기 권한이 있다']);
    expect(사전['XQ-FN-103']).toEqual(['일반 회원으로 로그인해 있다']);
  });

  it('옛 꼴 파일은 전과 같이 한 건이고 프로시저 칸이 없다', () => {
    const 옛 = 결과.specs.find((s) => s.tcId === 'XQ-001')!;
    expect(옛).toMatchObject({ filePath: join('xq', 'XQ-001.spec.ts'), precondition: [] });
    expect([옛.procId, 옛.procSeq, 옛.procName]).toEqual([undefined, undefined, undefined]);
    expect(결과.duplicates).toEqual([]);
  });

  it('defineProcedure 가 던진 어긋남은 defineCase 가 던진 것과 같이 읽기 실패로 남는다 — check:tests 가 K8 로 찍는다', () => {
    const 실패 = Object.fromEntries(결과.failures.map((f) => [f.file, f.message]));
    expect(Object.keys(실패).sort()).toEqual(['XQ-002', 'XQ-TP-002', 'XQ-TP-003', 'XQ-TP-004'].map((n) => join('xq', `${n}.spec.ts`)));
    expect(실패[join('xq', 'XQ-002.spec.ts')]).toContain('XQ-002');
    expect(실패[join('xq', 'XQ-TP-002.spec.ts')]).toContain('XQ-FN-201 의 keepAppData · launchIntent 는 프로시저에 적는다');
    expect(실패[join('xq', 'XQ-TP-003.spec.ts')]).toContain('XQ-FN-301 의 platforms 가 프로시저와 다르다');
    expect(실패[join('xq', 'XQ-TP-004.spec.ts')]).toContain('게임 미션 XQ-GS-401 는 프로시저에 넣지 않는다');
  });

  it('맡은 파일만 볼 때도 프로시저 파일의 케이스를 전부 견준다 — 첫 케이스만 읽지 않는다', async () => {
    const 내것 = { ...결과.specs.find((s) => s.tcId === 'XQ-001')!, tcId: 'XQ-FN-103', filePath: join('xq', '새.spec.ts') };
    expect(await duplicatesWith([내것], 뿌리)).toEqual([{ tcId: 'XQ-FN-103', files: [join('xq', 'XQ-TP-001.spec.ts'), join('xq', '새.spec.ts')] }]);
  });

  it('단계 제목과 화면 연결을 케이스 구간마다 낸다 — 보류 케이스 앞 절차는 그 뒤 케이스 것이다', async () => {
    const 읽은 = 결과.specs.filter((s) => s.procId === 'XQ-TP-001');
    const { 제목들, 문제 } = await 단계제목들(뿌리, 읽은);
    expect(문제).toEqual([]);
    expect(Object.fromEntries(제목들)).toEqual({
      'XQ-FN-101': ['글쓰기 화면을 연다', '본문을 비운다'],
      'XQ-FN-102': [],
      'XQ-FN-103': ['사진을 고른다', '타임라인을 연다'],
    });
    expect((await 화면지도줄들(뿌리, 읽은)).map((줄) => [줄.tcId, 줄.file, 줄.screenUrl])).toEqual([['XQ-FN-101', 'tests/xq/pages/compose.page.ts', 'app:compose']]);
  });
});
