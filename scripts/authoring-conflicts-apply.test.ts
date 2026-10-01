// 겹친 케이스를 고른 대로 적용 — 남긴다(겹칠 때만 새 번호) · 뺀다 (작성 §3.6 「★ 반영 때 겹침 검사」)
import { describe, expect, it } from 'vitest';

import type { 겹침 } from '../apps/admin/src/authoring/conflicts.js';
import { 결정계산, 다음번호, 번호바꾸기, 처리줄, 표번호바꾸기, 표줄빼기 } from './authoring-conflicts-apply.js';

const 케이스 = (tcId: string, 제목 = '쿠폰') =>
  `import { defineCase, step } from '@platform/kit';\n\nexport const spec = defineCase({\n  tcId: '${tcId}',\n  name: '${제목}',\n  platforms: ['desktop'],\n});\n\nawait step('${tcId} 화면 열기', async () => {});\n`;
const 머리 = '| 요구 | 축 | 전제 | 조작 | 결과 | 출처 | tcId | 작성 시점 |\n|------|----|------|------|------|------|------|----------|';
const 줄 = (번호: number, tcId: string) => `| ${String(번호)} | 정상 | 전제 | 조작 | 결과 | 9 REQ-7 | ${tcId} | 2026-10-01 |`;
const 표 = (줄들: string[], 제외: string[] = []) =>
  ['# PAY', '', '## 요구사항', '', 머리, ...줄들, '', '## 판정 불가', '', '| 요구 | 까닭 | tcId |', '|---|---|---|', ...제외, ''].join('\n');

const 겹침줄 = (tcId: string, kinds: 겹침['kinds'], file = `tests/pay/${tcId}.spec.ts`): 겹침 => ({
  tcId,
  name: '쿠폰',
  file,
  kinds,
  with: [{ tcId, name: '먼저 온 쿠폰', file: `tests/pay/${tcId}-main.spec.ts` }],
});

describe('다음 번호', () => {
  it('같은 접두사의 가장 큰 번호 + 1 부터 차례로, 세 자리를 지킨다', () => {
    expect(다음번호(new Set(['PAY-001', 'PAY-040', 'PAY-007', 'MKT-900']), 'PAY', 2)).toEqual(['PAY-041', 'PAY-042']);
  });

  it('999 를 넘으면 null — 파일 이름 규칙이 세 자리다', () => {
    expect(다음번호(new Set(['PAY-998']), 'PAY', 1)).toEqual(['PAY-999']);
    expect(다음번호(new Set(['PAY-998']), 'PAY', 2)).toBeNull();
  });
});

describe('번호 바꾸기', () => {
  it('defineCase 의 tcId 리터럴만 바꾸고 절차 제목 속 같은 글자는 그대로 둔다', () => {
    const 바뀐 = 번호바꾸기(케이스('PAY-002'), 'PAY-002', 'PAY-041');
    expect(바뀐).toContain("tcId: 'PAY-041'");
    expect(바뀐).toContain("step('PAY-002 화면 열기'");
  });

  it('tcId 가 다르면 그대로', () => {
    expect(번호바꾸기(케이스('PAY-003'), 'PAY-002', 'PAY-041')).toBe(케이스('PAY-003'));
  });
});

describe('표 고치기', () => {
  it('표 줄의 그 tcId 칸만 새 번호로 — 「제거함」 칸과 본문 글은 안 건드린다', () => {
    const 글 = 표([줄(1, 'PAY-002'), 줄(2, 'PAY-003')], ['| 4 | 제거함(PAY-002) 과 비슷 | 제거함(PAY-002) |']);
    const 바뀐 = 표번호바꾸기(글, 'PAY-002', 'PAY-041');
    expect(바뀐).toContain(줄(1, 'PAY-041'));
    expect(바뀐).toContain('| 4 | 제거함(PAY-002) 과 비슷 | 제거함(PAY-002) |');
  });

  it('뺄 tcId 를 가진 표 줄은 절이 여럿이어도 통째로 뺀다', () => {
    const 글 = 표([줄(1, 'PAY-002'), 줄(2, 'PAY-003'), 줄(3, 'PAY-002')], ['| 9 | 기준 없음 | PAY-002 |']);
    const 바뀐 = 표줄빼기(글, 'PAY-002');
    expect(바뀐).not.toMatch(/\| PAY-002 \|/);
    expect(바뀐).toContain(줄(2, 'PAY-003'));
    expect(바뀐).toContain(머리);
  });
});

describe('결정 계산', () => {
  const 파일들: Record<string, string> = {
    'tests/pay/PAY-002.spec.ts': 케이스('PAY-002'),
    'tests/pay/PAY-003.spec.ts': 케이스('PAY-003'),
    'tests/pay/coupon.spec.ts': 케이스('PAY-004'),
  };
  const 읽기 = (f: string) => 파일들[f] ?? '';
  const 요청표 = 표([줄(1, 'PAY-002'), 줄(2, 'PAY-003'), 줄(3, 'PAY-004')]);
  const 쓴번호 = new Set(['PAY-001', 'PAY-002', 'PAY-003', 'PAY-004', 'PAY-040']);

  it('남긴다 + tc_id 겹침 → 새 번호로 파일 이름 · 글 · 표 칸이 바뀐다. 여럿이면 tcId 차례로 번호를 준다', () => {
    const 결과 = 결정계산({
      겹침: [겹침줄('PAY-003', ['TCID']), 겹침줄('PAY-002', ['TCID', 'NAME'])],
      결정: [
        { tcId: 'PAY-002', action: 'KEEP' },
        { tcId: 'PAY-003', action: 'KEEP' },
      ],
      읽기,
      요청표,
      쓴번호,
    });
    if ('사유' in 결과) throw new Error(결과.사유);
    expect(결과.지우기).toEqual(['tests/pay/PAY-002.spec.ts', 'tests/pay/PAY-003.spec.ts']);
    expect(결과.쓰기.map((w) => w.file)).toEqual(['tests/pay/PAY-041.spec.ts', 'tests/pay/PAY-042.spec.ts']);
    expect(결과.쓰기[0]?.글).toContain("tcId: 'PAY-041'");
    expect(결과.표).toContain(줄(1, 'PAY-041'));
    expect(결과.표).toContain(줄(2, 'PAY-042'));
    expect(결과.바뀐것).toEqual([
      { 옛: 'PAY-002', 새: 'PAY-041' },
      { 옛: 'PAY-003', 새: 'PAY-042' },
    ]);
  });

  it('파일 이름에 tcId 가 없으면 이름은 그대로 두고 글만 바꾼다', () => {
    const 결과 = 결정계산({
      겹침: [겹침줄('PAY-004', ['TCID'], 'tests/pay/coupon.spec.ts')],
      결정: [{ tcId: 'PAY-004', action: 'KEEP' }],
      읽기,
      요청표,
      쓴번호,
    });
    if ('사유' in 결과) throw new Error(결과.사유);
    expect(결과.지우기).toEqual([]);
    expect(결과.쓰기).toEqual([{ file: 'tests/pay/coupon.spec.ts', 글: 케이스('PAY-041').replace("'PAY-041 화면", "'PAY-004 화면") }]);
  });

  it('남긴다 + 요구 번호 · 이름만 겹치면 아무것도 안 바꾼다', () => {
    const 결과 = 결정계산({
      겹침: [겹침줄('PAY-002', ['REQUIREMENT', 'NAME'])],
      결정: [{ tcId: 'PAY-002', action: 'KEEP' }],
      읽기,
      요청표,
      쓴번호,
    });
    expect(결과).toEqual({ 쓰기: [], 지우기: [], 표: 요청표, 바뀐것: [] });
  });

  it('뺀다 → 그 케이스 파일을 지우고 그 tcId 의 표 줄을 뺀다', () => {
    const 결과 = 결정계산({
      겹침: [겹침줄('PAY-003', ['NAME'])],
      결정: [{ tcId: 'PAY-003', action: 'DROP' }],
      읽기,
      요청표,
      쓴번호,
    });
    if ('사유' in 결과) throw new Error(결과.사유);
    expect(결과.지우기).toEqual(['tests/pay/PAY-003.spec.ts']);
    expect(결과.쓰기).toEqual([]);
    expect(결과.표).not.toContain('PAY-003');
    expect(결과.바뀐것).toEqual([{ 옛: 'PAY-003', 뺌: true }]);
  });

  it('겹침 목록 밖의 결정은 무시하고, 결정 없는 겹침이 있으면 사유를 낸다', () => {
    const 무시 = 결정계산({
      겹침: [겹침줄('PAY-002', ['NAME'])],
      결정: [
        { tcId: 'PAY-002', action: 'KEEP' },
        { tcId: 'PAY-050', action: 'DROP' },
      ],
      읽기,
      요청표,
      쓴번호,
    });
    expect(무시).toMatchObject({ 지우기: [], 바뀐것: [] });
    const 모자람 = 결정계산({ 겹침: [겹침줄('PAY-002', ['NAME'])], 결정: [], 읽기, 요청표, 쓴번호 });
    expect(모자람).toEqual({ 사유: expect.stringContaining('1건') });
  });

  it('새 번호가 999 를 넘으면 사유', () => {
    const 결과 = 결정계산({
      겹침: [겹침줄('PAY-002', ['TCID'])],
      결정: [{ tcId: 'PAY-002', action: 'KEEP' }],
      읽기,
      요청표,
      쓴번호: new Set(['PAY-999']),
    });
    expect(결과).toEqual({ 사유: expect.stringContaining('999') });
  });

  it('같은 판이면 다시 계산해도 같은 번호가 나온다 — CI 가 빨개져 다시 반영해도 번호가 안 바뀐다', () => {
    const 판 = { 겹침: [겹침줄('PAY-002', ['TCID'])], 결정: [{ tcId: 'PAY-002', action: 'KEEP' as const }], 읽기, 요청표, 쓴번호 };
    expect(결정계산(판)).toEqual(결정계산(판));
  });
});

describe('PR 본문 처리 줄', () => {
  it('바꾼 번호와 뺀 케이스를 한 줄로', () => {
    expect(
      처리줄([
        { 옛: 'MKT-042', 새: 'MKT-061' },
        { 옛: 'MKT-050', 뺌: true },
      ]),
    ).toBe('겹침 처리: MKT-042 → MKT-061 · MKT-050 뺌');
    expect(처리줄([])).toBeNull();
  });
});
