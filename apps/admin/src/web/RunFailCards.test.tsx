// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

import { 판정흐름 } from './Summary.js';
import { 그리기, 기본단계, 단계, 장치, 줄, 쪽, 케이스 } from './RunFailCards.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('실패 케이스 카드 (실행 §8.3)', () => {
  it('케이스마다 카드 하나, 깨진 디바이스의 사전조건 · 입력 · 절차와 모든 확인을 펼친다', async () => {
    const 칸 = {
      params: {},
      paramSchema: { properties: { email: { description: '이메일', default: 'a@b.kr' } } },
    };
    그리기(
      쪽([
        케이스('ZZI-0001', '회원가입', [장치('desktop', 1, {}, 칸)]),
        케이스('ZZI-0002', '로그인', [장치('mobile', 2, {}, { precondition: ['가입한 계정'] })]),
      ]),
      [줄(1, 'ZZI-0001', 'desktop', 'FAIL'), 줄(2, 'ZZI-0002', 'mobile', 'FAIL')],
    );

    const 카드들 = await screen.findAllByRole('article');
    expect(카드들).toHaveLength(2);
    const 첫 = within(카드들[0]!);
    expect(첫.getByText('ZZI-0001')).toBeDefined();
    expect(첫.getByText('회원가입')).toBeDefined();
    expect(첫.getByText('가입하지 않은 이메일')).toBeDefined();
    expect(첫.getByText('로그인 양식을 채운다')).toBeDefined();
    expect(첫.getByText('가입 버튼을 누른다')).toBeDefined();
    expect(첫.getByText('입력 칸이 보인다')).toBeDefined();
    expect(첫.getByText('가입 완료 안내가 보인다')).toBeDefined();
    expect(첫.getByText('가입한 이메일이 보인다')).toBeDefined();
    expect(within(카드들[1]!).getByText('가입한 계정')).toBeDefined();
  });

  it('사전조건은 하나씩 서로 다른 목록 항목이다', async () => {
    그리기(
      쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1, {}, { precondition: ['사이트에 접근할 수 있다', '목록이 비어 있다'] })])]),
      [줄(1, 'ZZI-0001', 'desktop', 'FAIL')],
    );

    const 카드 = within(await screen.findByRole('article'));
    const 첫째 = 카드.getByText('사이트에 접근할 수 있다').closest('li');
    const 둘째 = 카드.getByText('목록이 비어 있다').closest('li');
    expect(첫째).not.toBeNull();
    expect(둘째).not.toBeNull();
    expect(첫째).not.toBe(둘째);
  });

  it('입력 칸이 비어 박제되면 박제 스키마의 default 로, 비밀값은 가려서 적는다', async () => {
    그리기(
      쪽([
        케이스('ZZI-0001', '회원가입', [
          장치(
            'desktop',
            1,
            {},
            {
              params: { memo: '직접 적은 값' },
              paramSchema: {
                properties: {
                  email: { description: '이메일', default: 'a@b.kr' },
                  password: { description: '비밀번호', default: 'real-secret' },
                  memo: { description: '메모' },
                },
              },
            },
          ),
        ]),
      ]),
    );

    await screen.findByText('이메일');
    expect(screen.getByText('a@b.kr')).toBeDefined();
    expect(screen.getByText('********')).toBeDefined();
    expect(screen.getByText('직접 적은 값')).toBeDefined();
    expect(screen.queryByText('real-secret')).toBeNull();
  });

  it('같은 절차 · 같은 확인 · 같은 실제 값으로 깨진 디바이스는 절차를 한 번만 그리고 머리에 묶어 적는다', async () => {
    그리기(
      쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1), 장치('mobile', 2, {}, { durationMs: 4900 })])]),
      [줄(1, 'ZZI-0001', 'desktop', 'FAIL'), 줄(2, 'ZZI-0001', 'mobile', 'FAIL')],
    );

    expect(await screen.findByText('PC · 모바일')).toBeDefined();
    expect(screen.getAllByText('가입 버튼을 누른다')).toHaveLength(1);
    expect(screen.getByText('4.20초')).toBeDefined();
    expect(screen.getByText('4.90초')).toBeDefined();
  });

  it('실제 값이 다르면 따로 그린다', async () => {
    그리기(
      쪽([
        케이스('ZZI-0001', '회원가입', [
          장치('desktop', 1, {}, { steps: 기본단계('없음') }),
          장치('mobile', 2, {}, { steps: 기본단계('비어 있음') }),
        ]),
      ]),
      [줄(1, 'ZZI-0001', 'desktop', 'FAIL'), 줄(2, 'ZZI-0001', 'mobile', 'FAIL')],
    );

    await screen.findAllByText('가입 버튼을 누른다');
    expect(screen.getAllByText('가입 버튼을 누른다')).toHaveLength(2);
    expect(screen.queryByText('PC · 모바일')).toBeNull();
  });

  it('디바이스 머리에 변화 · 회차 · 소요 · 흐름 막대를 적는다', async () => {
    const 칸 = (실제값: string) => ({ steps: 기본단계(실제값) });
    그리기(
      쪽([
        케이스('ZZI-0001', '회원가입', [
          장치('desktop', 1, { change: '새로깨짐', recent: ['FAIL', 'PASS', 'PASS'] }, 칸('a')),
          장치('mobile', 2, { change: '계속깨짐', streak: 2, recent: ['FAIL', 'FAIL', 'PASS', 'PASS'] }, 칸('b')),
          장치('android', 3, { change: '계속깨짐', streak: 5, recent: ['FAIL', 'FAIL', 'FAIL', 'FAIL', 'FAIL'], attempts: 5, failedAttempts: 2 }, 칸('c')),
        ]),
        케이스('ZZI-0002', '로그인', [장치('desktop', 4, { change: null, streak: null })]),
      ]),
      [
        줄(1, 'ZZI-0001', 'desktop', 'FAIL'),
        줄(2, 'ZZI-0001', 'mobile', 'FAIL'),
        줄(3, 'ZZI-0001', 'android', 'FAIL'),
        줄(4, 'ZZI-0002', 'desktop', 'FAIL'),
      ],
    );

    const 카드들 = await screen.findAllByRole('article');
    const 첫 = within(카드들[0]!);
    expect(첫.getByText('신규 실패')).toBeDefined();
    expect(첫.getByText('연속 실패 2회')).toBeDefined();
    expect(첫.getByText('연속 실패 5회 이상')).toBeDefined();
    expect(첫.getByText('5회 중 2회 실패')).toBeDefined();
    expect(첫.getAllByText('qa 서버 · 이 실행까지')).toHaveLength(3);
    const 둘째 = within(카드들[1]!);
    expect(둘째.queryByText(/신규 실패|연속 실패|회 중/)).toBeNull();
    expect(둘째.getByText('qa 서버 · 이 실행까지')).toBeDefined();
  });

  it('확인 문장 없이 깨진 디바이스는 오류의 첫 줄만 적고 120자에서 자른다', async () => {
    const 멈춤 = (message: string) => ({
      steps: [단계(1, '페이지를 연다', [], { status: 'FAIL' as const })],
      error: { message },
    });
    그리기(
      쪽([
        케이스('ZZI-0001', '회원가입', [장치('desktop', 1, {}, 멈춤('서버에 닿지 못했습니다\n  at connect (net.js:12)\n  at run'))]),
        케이스('ZZI-0002', '로그인', [장치('desktop', 2, {}, 멈춤(`${'가'.repeat(130)}\n둘째 줄`))]),
      ]),
      [줄(1, 'ZZI-0001', 'desktop', 'FAIL'), 줄(2, 'ZZI-0002', 'desktop', 'FAIL')],
    );

    expect(await screen.findByText('서버에 닿지 못했습니다')).toBeDefined();
    expect(screen.queryByText(/net\.js/)).toBeNull();
    expect(screen.getByText(`${'가'.repeat(120)}…`)).toBeDefined();
    expect(screen.queryByText(/둘째 줄/)).toBeNull();
  });

  it('확인이 있는 실패는 오류 문장을 따로 적지 않는다', async () => {
    그리기(쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1, {}, { error: { message: '숨길 원문 오류' } })])]));

    await screen.findByText('가입한 이메일이 보인다');
    expect(screen.queryByText(/숨길 원문 오류/)).toBeNull();
  });
});

describe('판정흐름의 앞말', () => {
  it('앞말을 주면 그 글과 「맨 앞이 이번 실행」 읽기 글이 붙고, 안 주면 지금과 같다', () => {
    const { container, rerender } = render(<판정흐름 recent={['FAIL', 'PASS']} />);
    expect(container.querySelectorAll('.spark i')).toHaveLength(5);
    expect(screen.queryByText('맨 앞이 이번 실행')).toBeNull();

    rerender(<판정흐름 recent={['FAIL', 'PASS']} 앞말="qa 서버 · 이 실행까지" />);
    expect(screen.getByText('qa 서버 · 이 실행까지')).toBeDefined();
    expect(screen.getByText('맨 앞이 이번 실행')).toBeDefined();
    expect(container.querySelectorAll('.spark i')).toHaveLength(5);
  });
});
