// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

import { 판정흐름 } from './Summary.js';
import type { StepResult } from './api.js';
import { RUN_ID, 그리기, 기본단계, 단계, 장치, 줄, 쪽, 케이스 } from './RunFailCards.fixture.js';

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

describe('실패 카드의 디바이스 머리 (실행 §8.3 · DESIGN.md 실행 결과)', () => {
  it('신규 실패 글자는 실패 글자 색 클래스를 쓰고 연속 실패는 안 쓴다', async () => {
    const 칸 = (실제값: string) => ({ steps: 기본단계(실제값) });
    그리기(
      쪽([
        케이스('ZZI-0001', '회원가입', [
          장치('desktop', 1, { change: '새로깨짐' }, 칸('a')),
          장치('mobile', 2, { change: '계속깨짐', streak: 2, recent: ['FAIL', 'FAIL', 'PASS'] }, 칸('b')),
        ]),
      ]),
      [줄(1, 'ZZI-0001', 'desktop', 'FAIL'), 줄(2, 'ZZI-0001', 'mobile', 'FAIL')],
    );

    expect((await screen.findByText('신규 실패')).className).toContain('fc-new');
    expect(screen.getByText('연속 실패 2회').className).not.toContain('fc-new');
  });

  it('회차가 둘 이상이면 소요는 회차 평균이고 「평균」을 붙인다', async () => {
    그리기(
      쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1, { attempts: 2, failedAttempts: 2 })])]),
      [
        줄(1, 'ZZI-0001', 'desktop', 'FAIL', { attempt: 1, durationMs: 400 }),
        줄(2, 'ZZI-0001', 'desktop', 'FAIL', { attempt: 2, durationMs: 560 }),
      ],
    );

    expect(await screen.findByText('0.48초 평균')).toBeDefined();
    expect(screen.queryByText('4.20초')).toBeNull();
  });

  it('회차가 하나면 평균 글자 없이 그 회차의 소요다', async () => {
    그리기(쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)])]));

    expect(await screen.findByText('4.20초')).toBeDefined();
    expect(screen.queryByText(/평균/)).toBeNull();
  });
});

describe('디바이스마다 상세 링크 (실행 §8.3)', () => {
  const 다른실패 = (실제값: string) => ({ steps: 기본단계(실제값) });

  it('카드 머리에는 상세 링크가 없고 디바이스 머리 줄마다 「상세」가 자기 항목을 가리킨다', async () => {
    그리기(
      쪽([
        케이스('ZZI-0001', '회원가입', [
          장치('desktop', 11, {}, 다른실패('a')),
          장치('mobile', 12, {}, 다른실패('b')),
        ]),
      ]),
      [줄(11, 'ZZI-0001', 'desktop', 'FAIL'), 줄(12, 'ZZI-0001', 'mobile', 'FAIL')],
    );

    const 링크들 = await screen.findAllByRole('link', { name: '상세' });
    expect(링크들.map((a) => a.getAttribute('href'))).toEqual([`#/runs/${RUN_ID}/items/11`, `#/runs/${RUN_ID}/items/12`]);
    expect(screen.queryByRole('link', { name: '상세 보기' })).toBeNull();
    expect(document.querySelector('.fc-head a')).toBeNull();
  });

  it('같은 실패로 묶인 디바이스도 각자 상세 링크를 갖는다', async () => {
    그리기(
      쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 11), 장치('mobile', 12)])]),
      [줄(11, 'ZZI-0001', 'desktop', 'FAIL'), 줄(12, 'ZZI-0001', 'mobile', 'FAIL')],
    );

    const 링크들 = await screen.findAllByRole('link', { name: '상세' });
    expect(링크들.map((a) => a.getAttribute('href'))).toEqual([`#/runs/${RUN_ID}/items/11`, `#/runs/${RUN_ID}/items/12`]);
  });

  it('카드 안 접힌 통과 줄에도 「상세」가 첫 회차를 가리킨다', async () => {
    그리기(
      쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 11)])]),
      [줄(11, 'ZZI-0001', 'desktop', 'FAIL'), 줄(12, 'ZZI-0001', 'mobile', 'PASS', { attempt: 1 }), 줄(13, 'ZZI-0001', 'mobile', 'PASS', { attempt: 2 })],
    );

    await screen.findByRole('button', { name: /ZZI-0001.*모바일/ });
    const 통과줄 = document.querySelector('.fc-pass');
    expect(통과줄?.querySelector('a')?.getAttribute('href')).toBe(`#/runs/${RUN_ID}/items/12`);
    expect(통과줄?.querySelector('a')?.textContent).toBe('상세');
  });
});

describe('묶인 디바이스는 실패 시점 화면을 나란히 보인다 (실행 §8.3)', () => {
  const 화면단계 = (): StepResult[] => [
    단계(1, '가입 버튼을 누른다', [['가입한 이메일이 보인다', 'FAIL', 'new@demo.kr', '없음']], { screenshotPath: 'shot.png' }),
  ];

  it('같은 실패로 묶인 디바이스마다 이름을 단 화면이 하나씩 있다', async () => {
    그리기(
      쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 11, {}, { steps: 화면단계() }), 장치('mobile', 12, {}, { steps: 화면단계() })])]),
      [줄(11, 'ZZI-0001', 'desktop', 'FAIL'), 줄(12, 'ZZI-0001', 'mobile', 'FAIL')],
    );

    await screen.findByRole('article');
    const 사진들 = [...document.querySelectorAll('img')];
    expect(사진들.map((img) => img.getAttribute('alt'))).toEqual([
      'PC 가입 버튼을 누른다 실패 시점 화면',
      '모바일 가입 버튼을 누른다 실패 시점 화면',
    ]);
    expect(사진들.map((img) => img.getAttribute('src'))).toEqual([
      `/api/screenshots/${RUN_ID}/11/1.png`,
      `/api/screenshots/${RUN_ID}/12/1.png`,
    ]);
  });

  it('디바이스 하나뿐이면 절차 안에 그대로 한 장이다', async () => {
    그리기(
      쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 11, {}, { steps: 화면단계() })])]),
      [줄(11, 'ZZI-0001', 'desktop', 'FAIL')],
    );

    await screen.findByRole('article');
    const 사진들 = [...document.querySelectorAll('img')];
    expect(사진들.map((img) => img.getAttribute('alt'))).toEqual(['가입 버튼을 누른다 실패 시점 화면']);
  });
});

describe('판정흐름의 앞말', () => {
  it('앞말을 주면 그 글이 붙고 막대 칸 수는 그대로다', () => {
    const { container, rerender } = render(<판정흐름 recent={['FAIL', 'PASS']} />);
    expect(container.querySelectorAll('.spark i')).toHaveLength(5);

    rerender(<판정흐름 recent={['FAIL', 'PASS']} 앞말="qa 서버 · 이 실행까지" />);
    expect(screen.getByText('qa 서버 · 이 실행까지')).toBeDefined();
    expect(container.querySelectorAll('.spark i')).toHaveLength(5);
  });
});
