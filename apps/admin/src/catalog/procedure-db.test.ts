// 프로시저 파일이 스캔 → 저장 → 목록 응답까지 이어지는지, 「프로시저 작성」 스위치가 꺼진 애플리케이션에는 안 올라가는지 본다 (공통/4-데이터모델 「테스트 프로시저 표」 · 카탈로그 §7)
// DB 검사는 DATABASE_URL 이 있을 때만 돈다

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 구간, 선언, 절차, 프로시저글 } from './procedure-fixture.js';
import { runScan } from './scanRun.js';
import { findCase, listCases, save } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 번호들 = ['XTS-001', 'XTS-FN-101', 'XTS-FN-102', 'XTS-FN-103'];
const 프로시저 = 프로시저글(절차('글쓰기 화면을 연다', ` await verify('준비 화면이 열렸다', true, true); `) + 구간('본문없음', '본문을 비운다', ` await verify('본문이 비었다', true, true); `) + 구간('글자수초과', '본문에 501자를 넣는다') + 구간('게시확인', '타임라인을 연다'), {
  procId: 'XTS-TP-001',
  선언들: 선언('본문없음', 'XTS-FN-101') + 선언('글자수초과', 'XTS-FN-102') + 선언('게시확인', 'XTS-FN-103'),
});
const 옛꼴 = `import { defineCase, test, verify } from '@platform/kit';
export const spec = defineCase({ tcId: 'XTS-001', name: '옛 꼴', platforms: ['android'], precondition: [], params: null, expected: null });
test(spec, async () => {
  await test.step('연다', async () => { await verify('맞다', true, true); });
});
`;

describe.skipIf(연결 === undefined)('프로시저 파일 스캔과 저장', () => {
  let 뿌리 = '';
  const 앞뿌리 = process.env.PLATFORM_TESTS_DIR;
  const 조용히 = { warn: () => undefined, error: () => undefined };

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 치우기 = async () => {
    await q('DELETE FROM case_screen WHERE tc_id = ANY($1)', [번호들]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
    await q("DELETE FROM service WHERE prefix = 'XTS'");
  };
  const 훑기 = async (): Promise<string[]> => (await runScan(조용히, (s) => s.prefix === 'XTS')).서비스별.get('XTS')?.problems ?? [];
  const 줄들 = async () =>
    (await q<{ tc_id: string }>('SELECT tc_id, is_active, proc_id, proc_seq, proc_name, precondition, step_titles, verify_statements FROM test_case WHERE tc_id = ANY($1) ORDER BY tc_id', [번호들])).rows;
  const 스위치 = (켬: boolean) => q("UPDATE service SET procedure_mode = $1 WHERE prefix = 'XTS'", [켬]);

  beforeAll(async () => {
    await 치우기();
    await q(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind) VALUES ('XTS', 'XTS 프로시저 스캔 검사용', '#3A5FCD', '', 'xts', 'APP')`);
    // @platform/kit 을 찾도록 저장소 안에 둔다 — 스캔은 이 폴더를 하위 프로세스에서 읽는다
    뿌리 = await mkdtemp(join(import.meta.dirname, '.proc-db-'));
    process.env.PLATFORM_TESTS_DIR = 뿌리;
    await mkdir(join(뿌리, 'xts'));
    await writeFile(join(뿌리, 'xts', 'XTS-TP-001.spec.ts'), 프로시저);
    await writeFile(join(뿌리, 'xts', 'XTS-001.spec.ts'), 옛꼴);
  });

  afterAll(async () => {
    if (앞뿌리 === undefined) delete process.env.PLATFORM_TESTS_DIR;
    else process.env.PLATFORM_TESTS_DIR = 앞뿌리;
    await rm(뿌리, { recursive: true, force: true });
    await 치우기();
  });

  it('스위치가 꺼진 애플리케이션의 프로시저 파일은 올리지 않고 문제 줄로 알린다 — 옛 꼴 파일은 그대로 올린다', async () => {
    expect(await 훑기()).toContain(`${join('xts', 'XTS-TP-001.spec.ts')}은 프로시저 파일인데 XTS 애플리케이션은 「프로시저 작성」이 꺼져 있어 올리지 않았다`);
    expect(await 줄들()).toMatchObject([{ tc_id: 'XTS-001', is_active: true, proc_id: null, proc_seq: null, proc_name: null, step_titles: ['연다'], verify_statements: ['맞다'] }]);
  });

  it('스위치를 켜면 케이스마다 한 줄씩 올리고 프로시저 번호 · 차례 · 이름 · 구간별 단계 제목 · 합친 사전조건을 담는다', async () => {
    await 스위치(true);
    expect((await 훑기()).filter((p) => p.includes('프로시저'))).toEqual([]);
    expect((await 줄들()).slice(1)).toMatchObject([
      { tc_id: 'XTS-FN-101', is_active: true, proc_id: 'XTS-TP-001', proc_seq: 1, proc_name: '글쓰기 — 입력 제한부터 게시까지', precondition: ['일반 회원으로 로그인해 있다'], step_titles: ['글쓰기 화면을 연다', '본문을 비운다'], verify_statements: ['본문이 비었다'] },
      { tc_id: 'XTS-FN-102', proc_id: 'XTS-TP-001', proc_seq: 2, step_titles: ['본문에 501자를 넣는다'], verify_statements: ['맞다'] },
      { tc_id: 'XTS-FN-103', proc_id: 'XTS-TP-001', proc_seq: 3, step_titles: ['타임라인을 연다'], verify_statements: ['맞다'] },
    ]);
  });

  it('케이스 상세와 목록 응답에 프로시저 번호 · 차례 · 이름 · 케이스 수가 실린다 — 옛 꼴 케이스는 넷 다 null 이다', async () => {
    expect(await findCase('XTS-FN-102')).toMatchObject({ procId: 'XTS-TP-001', procSeq: 2, procName: '글쓰기 — 입력 제한부터 게시까지', procCount: 3 });
    expect(await findCase('XTS-001')).toMatchObject({ procId: null, procSeq: null, procName: null, procCount: null });
    expect(await findCase('XTS-FN-101')).toMatchObject({ verifyStatements: ['본문이 비었다'] });
    expect(await findCase('XTS-001')).toMatchObject({ verifyStatements: ['맞다'] });
    const 목록 = (await listCases({ service: 'XTS', q: '', activeOnly: true, page: 1, pageSize: 50 })).items;
    expect(목록.map((c) => [c.tcId, c.procId, c.procSeq, c.procCount])).toEqual([
      ['XTS-001', null, null, null],
      ['XTS-FN-101', 'XTS-TP-001', 1, 3],
      ['XTS-FN-102', 'XTS-TP-001', 2, 3],
      ['XTS-FN-103', 'XTS-TP-001', 3, 3],
    ]);
  });

  it('목록은 proc_seq 차례로 붙여 주고 · 찾기는 프로시저 번호 · 이름에도 맞는다 — 옛 꼴 케이스는 안 나온다', async () => {
    await q("UPDATE test_case SET proc_seq = CASE tc_id WHEN 'XTS-FN-101' THEN 3 WHEN 'XTS-FN-103' THEN 1 ELSE proc_seq END WHERE proc_id = 'XTS-TP-001'");
    try {
      const 찾기 = async (말: string) => (await listCases({ service: 'XTS', q: 말, activeOnly: true, page: 1, pageSize: 50 })).items.map((c) => c.tcId);
      expect(await 찾기('')).toEqual(['XTS-001', 'XTS-FN-103', 'XTS-FN-102', 'XTS-FN-101']);
      expect(await 찾기('XTS-TP-001')).toEqual(['XTS-FN-103', 'XTS-FN-102', 'XTS-FN-101']);
      expect(await 찾기('입력 제한')).toEqual(['XTS-FN-103', 'XTS-FN-102', 'XTS-FN-101']);
    } finally {
      await q("UPDATE test_case SET proc_seq = CASE tc_id WHEN 'XTS-FN-101' THEN 1 WHEN 'XTS-FN-103' THEN 3 ELSE proc_seq END WHERE proc_id = 'XTS-TP-001'");
    }
  });

  it('케이스 수는 활성 케이스만 세고, 내려간 케이스 자신은 케이스 수가 null 이다', async () => {
    await q("UPDATE test_case SET is_active = false WHERE tc_id = 'XTS-FN-103'");
    expect((await findCase('XTS-FN-101'))?.procCount).toBe(2);
    expect(await findCase('XTS-FN-103')).toMatchObject({ procId: 'XTS-TP-001', procSeq: 3, procCount: null });
    await q("UPDATE test_case SET is_active = true WHERE tc_id = 'XTS-FN-103'");
  });

  it('옛 꼴로 되돌린 케이스는 프로시저 세 칸을 비운다', async () => {
    const 옛 = { tcId: 'XTS-FN-103', name: '게시확인', platforms: ['android' as const], precondition: [], paramSchema: {}, expectedSchema: {}, filePath: 'xts/XTS-FN-103.spec.ts' };
    await save([옛], false, 'XTS');
    expect(await findCase('XTS-FN-103')).toMatchObject({ procId: null, procSeq: null, procName: null, procCount: null });
    expect((await findCase('XTS-FN-101'))?.procCount).toBe(2);
  });

  it('스위치를 다시 끄고 훑으면 프로시저 안 케이스를 비활성으로 내린다', async () => {
    await 스위치(false);
    expect((await 훑기()).some((p) => p.includes('「프로시저 작성」이 꺼져 있어'))).toBe(true);
    expect((await 줄들()).map((r) => [r.tc_id, r.is_active])).toEqual([
      ['XTS-001', true],
      ['XTS-FN-101', false],
      ['XTS-FN-102', false],
      ['XTS-FN-103', false],
    ]);
  });
});
