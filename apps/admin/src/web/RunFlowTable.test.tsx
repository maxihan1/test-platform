// @vitest-environment jsdom
// 실행 차례 표 검사 — 프로시저 헤더 · 차례 번호 · 디바이스 칸 · 줄 아래 사유 · 쪽 넘김 (도메인/실행 §8.3)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';

import { 절차, 줄들, 줄안, 항목, 흐름그리기 } from './RunFlow.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 머리 = () => document.querySelector('.rf-proc') as HTMLElement;
const 사유들 = (tcId: string) => [...줄안(tcId).querySelectorAll('.rf-why')].map((el) => el.textContent);

describe('프로시저 헤더', () => {
  const 다섯 = () => [
    항목(1, 'P-A', 'android', 'PASS', 절차('MTA-TP-022', 1)),
    항목(2, 'P-B', 'android', 'FAIL', 절차('MTA-TP-022', 2)),
    항목(3, 'P-C', 'android', 'NA', { ...절차('MTA-TP-022', 3), blockedBy: 'P-B', error: { message: 'BLOCKED' } }),
    항목(4, 'P-D', 'android', 'NA', { ...절차('MTA-TP-022', 4), blockedBy: 'P-B', error: { message: 'BLOCKED' } }),
    항목(5, 'P-E', 'android', 'PASS', 절차('MTA-TP-022', 5)),
  ];

  it('번호 · 이름과 「5건 · Fail 1 · Blocked 2」를 적는다', () => {
    흐름그리기(다섯());

    expect(머리().querySelector('.rf-proc-id')?.textContent).toBe('MTA-TP-022');
    expect(머리().querySelector('b')?.textContent).toBe('프로시저 MTA-TP-022');
    expect(머리().querySelector('.rf-count')?.textContent).toBe('5건 · Fail 1 · Blocked 2');
  });

  it('막히지 않은 미실행은 Not tested 로 따로 세고 0 인 것은 안 적는다', () => {
    흐름그리기([항목(1, 'P-A', 'android', 'PASS', 절차('P1', 1)), 항목(2, 'P-B', 'android', 'NA', 절차('P1', 2))]);

    expect(머리().querySelector('.rf-count')?.textContent).toBe('2건 · Not tested 1');
  });

  it('판정 점이 케이스 수만큼 실행 차례로 선다 — 막힌 것은 blocked 모양이다', () => {
    흐름그리기(다섯());

    expect([...머리().querySelectorAll('.flow-dots i')].map((점) => 점.className)).toEqual(['fd-pass', 'fd-fail', 'fd-blocked', 'fd-blocked', 'fd-pass']);
  });

  it('아직 도는 케이스는 판정이 없어 점선 원이고 건수에 안 센다', () => {
    흐름그리기([항목(1, 'P-A', 'android', 'FAIL', 절차('P1', 1)), 항목(2, 'P-B', 'android', 'NA', { ...절차('P1', 2), finishedAt: null })], { 끝났나: false });

    expect([...머리().querySelectorAll('.flow-dots i')].map((점) => 점.className)).toEqual(['fd-fail', 'fd-none']);
    expect(머리().querySelector('.rf-count')?.textContent).toBe('2건 · Fail 1');
  });

  it('프로시저가 둘이면 헤더도 둘이고 헤더 없는 케이스는 헤더가 없다', () => {
    흐름그리기([항목(1, 'A', 'android', 'PASS', 절차('P1', 1)), 항목(2, 'B', 'android', 'PASS', 절차('P2', 1)), 항목(3, 'X', 'android', 'PASS')]);

    expect([...document.querySelectorAll('.rf-proc-id')].map((el) => el.textContent)).toEqual(['P1', 'P2']);
    expect(document.querySelectorAll('.rf-group')).toHaveLength(3);
    expect(document.querySelectorAll('.rf-group')[2]!.querySelector('.rf-proc')).toBeNull();
  });

  it('반복 실행이어도 헤더는 하나이고 케이스 줄에 「3/5 Pass」가 적힌다', () => {
    const 회차 = (n: number, status: 'PASS' | 'FAIL') => 항목(n, 'P-A', 'android', status, { ...절차('P1', 1), attempt: n });
    흐름그리기([회차(1, 'PASS'), 회차(2, 'PASS'), 회차(3, 'PASS'), 회차(4, 'FAIL'), 회차(5, 'FAIL')]);

    expect(document.querySelectorAll('.rf-proc')).toHaveLength(1);
    expect(머리().querySelector('.rf-count')?.textContent).toBe('1건 · Fail 1');
    expect(줄안('P-A').textContent).toContain('3/5 Pass');
  });
});

describe('차례 번호와 줄 순서', () => {
  it('프로시저 안 케이스는 실행 차례 번호를 달고 헤더 없는 케이스는 번호가 비어 있다', () => {
    흐름그리기([
      항목(1, 'P-B', 'android', 'PASS', 절차('P1', 2)),
      항목(2, 'P-A', 'android', 'PASS', 절차('P1', 1)),
      항목(3, 'X', 'android', 'PASS'),
    ]);

    expect(줄들().map((줄) => [줄.querySelector('.rf-id')?.textContent, 줄.querySelector('.rf-seq')?.textContent])).toEqual([
      ['P-A', '1'],
      ['P-B', '2'],
      ['X', ''],
    ]);
  });

  it('실패가 있는 덩어리가 위로 오고 판정을 고르면 그 판정의 줄만 남는다', () => {
    const 항목들 = [항목(1, 'A', 'android', 'PASS'), 항목(2, 'B', 'android', 'FAIL'), 항목(3, 'C', 'android', 'PASS')];
    const { unmount } = 흐름그리기(항목들);
    expect(줄들().map((줄) => 줄.querySelector('.rf-id')?.textContent)).toEqual(['B', 'A', 'C']);
    expect(줄안('B').classList.contains('fail')).toBe(true);

    unmount();
    흐름그리기(항목들, { 처음: { 판정: 'PASS' } });
    expect(줄들().map((줄) => 줄.querySelector('.rf-id')?.textContent)).toEqual(['A', 'C']);
  });

  it('조건에 맞는 줄이 없으면 한 줄로 알린다', () => {
    흐름그리기([항목(1, 'A', 'android', 'PASS')], { 처음: { 판정: 'FAIL' } });

    expect(screen.getByText('조건에 맞는 결과가 없습니다')).toBeTruthy();
    expect(document.querySelector('.rf-table')).toBeNull();
  });
});

describe('디바이스 칸', () => {
  it('디바이스가 둘이면 머리 칸이 디바이스 이름이고 줄마다 칸이 둘이다', () => {
    흐름그리기([항목(1, 'A', 'desktop', 'PASS'), 항목(2, 'A', 'mobile', 'FAIL', { durationMs: 2500 })]);

    expect([...document.querySelectorAll('.rf-head span')].map((el) => el.textContent).filter((글) => 글 !== '')).toEqual(['TC ID', '케이스명', 'PC', '모바일']);
    const 줄 = 줄안('A');
    expect(줄.querySelectorAll('.rf-v')).toHaveLength(2);
    expect(within(줄).getByText('2.50초')).toBeTruthy();
  });

  it('디바이스가 하나면 머리가 「결과」 「소요 시간」이다', () => {
    흐름그리기([항목(1, 'A', 'android', 'PASS')]);

    expect([...document.querySelectorAll('.rf-head span')].map((el) => el.textContent).filter((글) => 글 !== '')).toEqual(['TC ID', '케이스명', '결과', '소요 시간']);
  });

  it('그 디바이스를 안 돈 케이스는 칸이 —이다', () => {
    흐름그리기([항목(1, 'A', 'desktop', 'PASS'), 항목(2, 'A', 'mobile', 'PASS'), 항목(3, 'B', 'desktop', 'PASS')]);

    const 칸들 = [...줄안('B').querySelectorAll('.device-none')].map((el) => el.textContent);
    expect(칸들).toEqual(['—']);
  });

  it('안 끝난 칸은 「진행 중」이고 판정을 적지 않는다', () => {
    흐름그리기([항목(1, 'A', 'android', 'NA', { finishedAt: null })], { 끝났나: false });

    expect(줄안('A').querySelector('.device-none')?.textContent).toBe('진행 중');
    expect(줄안('A').querySelector('.verdict, .vd')).toBeNull();
  });

  it('고른 디바이스만 칸이 되고 그 디바이스 항목이 없는 줄은 선 칸이 없어 빠진다', () => {
    흐름그리기([항목(1, 'A', 'desktop', 'PASS'), 항목(2, 'B', 'mobile', 'PASS')], { columns: ['mobile'], device: 'mobile' });

    expect(줄들().map((줄) => 줄.querySelector('.rf-id')?.textContent)).toEqual(['B']);
  });
});

describe('줄 아래 작은 글', () => {
  it('Blocked 줄은 판정 칸이 Blocked 이고 막은 케이스가 같은 실행에서 Fail 이면 「실패」를 붙인다', () => {
    흐름그리기([
      항목(1, 'P-B', 'android', 'FAIL', 절차('P1', 1)),
      항목(2, 'P-C', 'android', 'NA', { ...절차('P1', 2), blockedBy: 'P-B', error: { message: 'BLOCKED' } }),
    ]);

    expect(사유들('P-C')).toEqual(['선행 케이스 P-B 실패']);
    expect(줄안('P-C').querySelector('.vd-blocked')?.textContent).toBe('Blocked');
  });

  it('막은 케이스가 판정 없이 끝났으면 「제한 시간 초과」다', () => {
    흐름그리기([
      항목(1, 'P-B', 'android', 'NA', 절차('P1', 1)),
      항목(2, 'P-C', 'android', 'NA', { ...절차('P1', 2), blockedBy: 'P-B', error: { message: 'BLOCKED' } }),
    ]);

    expect(사유들('P-C')).toEqual(['선행 케이스 P-B 제한 시간 초과']);
  });

  it('막은 케이스의 판정을 이 실행에서 알 수 없으면 번호까지만 적는다', () => {
    흐름그리기([항목(2, 'P-C', 'android', 'NA', { ...절차('P1', 2), blockedBy: 'P-Z', error: { message: 'BLOCKED' } })]);

    expect(사유들('P-C')).toEqual(['선행 케이스 P-Z']);
  });

  it('막은 케이스 번호 없이 BLOCKED 사유 글자만 있으면 Blocked 로 읽고 사유 줄은 없다', () => {
    흐름그리기([항목(2, 'P-C', 'android', 'NA', { ...절차('P1', 2), error: { message: 'BLOCKED' } })]);

    expect(줄안('P-C').querySelector('.vd-blocked')).not.toBeNull();
    expect(사유들('P-C')).toEqual([]);
  });

  it('그 밖의 미실행은 사유를 사람 말로 적는다', () => {
    흐름그리기([항목(1, 'A', 'android', 'NA', { error: { message: '사용자가 중단' } })]);

    expect(사유들('A')).toEqual(['사용자가 중단']);
  });

  it('Fail 줄은 「실패 유형 — 한 줄」을 빨갛게 적고 입력값 한 줄도 같이 적는다', () => {
    흐름그리기([
      항목(1, 'A', 'android', 'FAIL', {
        failure: { type: 'mismatch', reason: '이메일 칸이 비어 있다' },
        params: { email: 'a@b.kr' },
        paramSchema: { properties: { email: { description: '이메일' } } },
      }),
    ]);

    expect(줄안('A').querySelector('.fail-reason')?.textContent).toBe('기대 결과 불일치 — 이메일 칸이 비어 있다');
    expect(사유들('A')[0]).toBe('이메일 a@b.kr');
  });

  it('비밀값 칸은 입력값 줄에서 가려진다', () => {
    흐름그리기([
      항목(1, 'A', 'android', 'FAIL', { params: { 비밀번호: 'hunter2' }, paramSchema: { type: 'object', properties: { 비밀번호: { type: 'string', secret: true } } } }),
    ]);

    expect(줄안('A').textContent).not.toContain('hunter2');
  });

  it('다섯 중 셋만 통과한 칸은 통과 색이 아니라 실패 색이다', () => {
    const 회차 = (n: number, status: 'PASS' | 'FAIL') => 항목(n, 'A', 'android', status, { attempt: n });
    흐름그리기([회차(1, 'PASS'), 회차(2, 'PASS'), 회차(3, 'PASS'), 회차(4, 'FAIL'), 회차(5, 'FAIL')]);

    expect(줄안('A').querySelector('.v-fail')?.textContent).toBe('3/5 Pass');
    expect(줄안('A').querySelector('.vd-pass')).toBeNull();
  });

  it('미확정 줄은 「미확정 · 사유」를 달고 판정 색을 바꾸지 않는다', () => {
    흐름그리기([항목(1, 'A', 'android', 'PASS', { unconfirmed: '기획서에 값이 없습니다' })]);

    expect(사유들('A')).toEqual(['미확정 · 기획서에 값이 없습니다']);
    expect(줄안('A').querySelector('.vd-pass')).not.toBeNull();
    expect(줄안('A').classList.contains('fail')).toBe(false);
  });

  it('이미 고쳐 통과한 케이스는 「수정 후 Pass」 꼬리표를 달고 판정은 Fail 그대로다', () => {
    흐름그리기([항목(1, 'A', 'android', 'FAIL')], { 자동수정: ['A'] });

    expect(줄안('A').querySelector('.fix-tag')?.textContent).toBe('수정 후 Pass');
    expect(줄안('A').classList.contains('fc-fixed')).toBe(true);
    expect(줄안('A').querySelector('.verdict.v-fail')).not.toBeNull();
  });

  it('입력값이 없으면 입력 줄을 만들지 않는다', () => {
    흐름그리기([항목(1, 'A', 'android', 'PASS')]);

    expect(사유들('A')).toEqual([]);
  });
});

describe('쪽 넘김', () => {
  const 예순 = () => Array.from({ length: 60 }, (_, i) => 항목(i + 1, `K${String(i + 1).padStart(2, '0')}`, 'android', 'PASS'));

  it('50줄씩 끊어 이전 · 다음을 두고 넘기면 펼친 줄을 비운다', () => {
    const { 마지막보기 } = 흐름그리기(예순(), { 처음: { 열린: ['K01'] } });

    expect(줄들()).toHaveLength(50);
    expect(screen.getByText('1 / 2')).toBeTruthy();
    expect((screen.getByRole('button', { name: '이전' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    expect(줄들()).toHaveLength(10);
    expect(마지막보기()).toMatchObject({ 쪽: 2, 열린: [] });
    expect((screen.getByRole('button', { name: '다음' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('줄이 한 쪽에 다 들어가면 쪽 넘김을 그리지 않는다', () => {
    흐름그리기(예순().slice(0, 50));

    expect(screen.queryByRole('button', { name: '다음' })).toBeNull();
  });

  it('프로시저가 쪽 사이에서 갈리지 않는다', () => {
    const 앞 = Array.from({ length: 45 }, (_, i) => 항목(i + 1, `K${String(i)}`, 'android', 'PASS'));
    const 절차줄 = Array.from({ length: 10 }, (_, i) => 항목(100 + i, `Q${String(i)}`, 'android', 'PASS', 절차('P1', i + 1)));
    흐름그리기([...앞, ...절차줄]);

    expect(줄들()).toHaveLength(55);
    expect(screen.queryByRole('button', { name: '다음' })).toBeNull();
  });
});
