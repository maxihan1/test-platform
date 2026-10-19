// 끝내기 result.cases 를 에이전트가 계산하는 순수 함수 검사 — 바뀐 파일 상태 · 명세 + 파일 + 표 → 케이스 목록 · 몸에 싣기

import { describe, expect, it, vi } from 'vitest';

import { 케이스모양검사 } from '../apps/admin/src/authoring/cases.js';
import { 바뀜풀기, 변경상태인자, 케이스목록만들기, 케이스실은몸, 케이스싣는손, type 케이스재료 } from './authoring-cases.js';

const 파일글: Record<string, string> = {
  'tests/demo/a.spec.ts': `verify('첫 확인', 1, 1);\nverify('둘째 확인', 1, 1);`,
  'tests/demo/b.spec.ts': `verify('고친 확인', 1, 1);`,
  'tests/demo/c.spec.ts': `verify('안 건드린 확인', 1, 1);`,
};
const 표 = [
  '## 요구사항',
  '',
  '| 요구 | 축 | 출처 | tcId |',
  '|---|---|---|---|',
  '| 1 | 정상 | DEMO-REQ-001 · DEMO-REQ-002 | `DEMO-FN-001` |',
  '| 2 | 예외 | DEMO-REQ-002 | DEMO-FN-001 |',
  '| 3 | 정상 | DEMO-REQ-003 | DEMO-FN-002 |',
].join('\n');

const 명세 = (tcId: string, filePath: string, name = `이름 ${tcId}`) => ({ tcId, name, filePath });

const 재료 = (바뀜: [string, 'NEW' | 'CHANGED'][], 표글 = 표): 케이스재료 => ({
  바뀜: new Map(바뀜),
  표글,
  접두사: 'DEMO',
  읽기: (f) => 파일글[f] ?? '',
});

describe('바뀜풀기', () => {
  it('추가는 NEW, 수정은 CHANGED, 삭제는 싣지 않는다', () => {
    const 낸것 = ['A', 'tests/demo/a.spec.ts', 'M', 'tests/demo/b.spec.ts', 'D', 'tests/demo/gone.spec.ts', ''].join('\0');
    expect([...바뀜풀기(낸것)]).toEqual([
      ['tests/demo/a.spec.ts', 'NEW'],
      ['tests/demo/b.spec.ts', 'CHANGED'],
    ]);
  });

  it('빈 출력은 빈 표다', () => {
    expect(바뀜풀기('').size).toBe(0);
  });

  it('git 인자는 이름 상태를 NUL 구분으로 기준...HEAD 에서 읽는다', () => {
    expect(변경상태인자('origin/main')).toEqual(expect.arrayContaining(['--name-status', '--no-renames', '-z', 'origin/main...HEAD']));
  });
});

describe('케이스목록만들기', () => {
  it('바뀐 파일의 케이스만 싣고 확인 문장은 소스 차례, 요구 번호는 표에서 중복 없이 읽는다', () => {
    const 목록 = 케이스목록만들기(
      [명세('DEMO-FN-001', 'demo/a.spec.ts'), 명세('DEMO-FN-002', 'demo/b.spec.ts'), 명세('DEMO-FN-003', 'demo/c.spec.ts')],
      재료([
        ['tests/demo/a.spec.ts', 'NEW'],
        ['tests/demo/b.spec.ts', 'CHANGED'],
      ]),
    );
    expect(목록).toEqual([
      { tcId: 'DEMO-FN-001', name: '이름 DEMO-FN-001', file: 'tests/demo/a.spec.ts', change: 'NEW', verifies: ['첫 확인', '둘째 확인'], reqs: ['DEMO-REQ-001', 'DEMO-REQ-002'] },
      { tcId: 'DEMO-FN-002', name: '이름 DEMO-FN-002', file: 'tests/demo/b.spec.ts', change: 'CHANGED', verifies: ['고친 확인'], reqs: ['DEMO-REQ-003'] },
    ]);
    expect(케이스모양검사(목록)).not.toBeNull();
  });

  it('표에 없는 케이스는 reqs 가 빈 목록이다', () => {
    const 목록 = 케이스목록만들기([명세('DEMO-FN-009', 'demo/a.spec.ts')], 재료([['tests/demo/a.spec.ts', 'NEW']]));
    expect(목록[0]?.reqs).toEqual([]);
  });

  it('서버가 거절할 줄(tcId 틀림 · 같은 tcId)은 빼고 나머지는 싣는다', () => {
    const 목록 = 케이스목록만들기(
      [명세('틀림', 'demo/a.spec.ts'), 명세('DEMO-FN-001', 'demo/a.spec.ts'), 명세('DEMO-FN-001', 'demo/b.spec.ts')],
      재료([
        ['tests/demo/a.spec.ts', 'NEW'],
        ['tests/demo/b.spec.ts', 'NEW'],
      ]),
    );
    expect(목록.map((c) => [c.tcId, c.file])).toEqual([['DEMO-FN-001', 'tests/demo/a.spec.ts']]);
  });

  it('긴 이름 · 확인 문장 · 많은 확인 문장은 상한으로 자른다', () => {
    const 긴글 = '가'.repeat(400);
    const 많은 = Array.from({ length: 60 }, (_, i) => `verify('문장 ${String(i)}', 1, 1);`).join('\n');
    const 읽기 = (f: string) => (f === 'tests/demo/long.spec.ts' ? `verify('${긴글}', 1, 1);\n${많은}` : '');
    const 목록 = 케이스목록만들기([명세('DEMO-FN-001', 'demo/long.spec.ts', 긴글)], { ...재료([['tests/demo/long.spec.ts', 'NEW']]), 읽기 });
    expect(목록[0]?.name.length).toBe(300);
    expect(목록[0]?.verifies.length).toBe(50);
    expect(목록[0]?.verifies[0]?.length).toBe(300);
    expect(케이스모양검사(목록)).not.toBeNull();
  });
});

describe('케이스실은몸', () => {
  const 몸 = { status: 'DONE', prUrl: 'p', result: { held: [] } };
  const 재료값 = 재료([['tests/demo/a.spec.ts', 'NEW']]);

  it('result 에 cases 를 더한다 — 다른 칸은 그대로', () => {
    const 나온 = 케이스실은몸(몸, [명세('DEMO-FN-001', 'demo/a.spec.ts')], 재료값);
    expect(나온).toMatchObject({ status: 'DONE', prUrl: 'p', result: { held: [], cases: [{ tcId: 'DEMO-FN-001', change: 'NEW' }] } });
  });

  it('result 가 없던 몸에도 싣는다', () => {
    const 나온 = 케이스실은몸({ status: 'DONE', prUrl: 'p' }, [명세('DEMO-FN-001', 'demo/a.spec.ts')], 재료값);
    expect(나온.result).toMatchObject({ cases: [{ tcId: 'DEMO-FN-001' }] });
  });

  it('스캔이나 바뀐 파일 표를 못 읽었으면 까닭을 남기고 몸을 그대로 둔다', () => {
    const 소리 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(케이스실은몸(몸, null, 재료값)).toBe(몸);
    expect(케이스실은몸(몸, [], null)).toBe(몸);
    expect(소리).toHaveBeenCalledTimes(2);
    소리.mockRestore();
  });

  it('읽었는데 바뀐 케이스가 하나도 없으면 빈 목록을 싣는다 — 못 읽은 옛 요청(null)과 가른다', () => {
    expect(케이스실은몸(몸, [명세('DEMO-FN-003', 'demo/c.spec.ts')], 재료값)).toMatchObject({ result: { cases: [] } });
  });
});

describe('케이스싣는손', () => {
  it('DONE 에만 싣는다 — 실패 · 중단은 그대로 지난다', async () => {
    const 받은: Record<string, unknown>[] = [];
    const 손 = 케이스싣는손(
      { 단계: async () => undefined, 끝내기: async (몸) => void 받은.push(몸) },
      () => ({ 명세들: [명세('DEMO-FN-001', 'demo/a.spec.ts')], 재료: 재료([['tests/demo/a.spec.ts', 'NEW']]) }),
    );
    await 손.끝내기({ status: 'DONE', prUrl: 'p' });
    await 손.끝내기({ status: 'FAILED', error: 'x' });
    expect(받은[0]?.result).toMatchObject({ cases: [{ tcId: 'DEMO-FN-001' }] });
    expect(받은[1]).toEqual({ status: 'FAILED', error: 'x' });
  });
});
