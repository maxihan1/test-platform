// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';

import { api } from './api.js';
import { RUN_ID, 그리기, 단계, 상세, 장치, 줄, 쪽, 케이스 } from './RunFailCard.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('실패 카드 — 통과 줄 · 디바이스 판정 · 불러오기 (실행 §8.3)', () => {
  it('그 케이스의 통과 · 미실행 디바이스는 한 줄이고, 펼칠 때만 상세를 한 번 불러온다', async () => {
    const 상세부름 = vi.spyOn(api, 'item').mockResolvedValue(
      상세(2, 'mobile', {
        status: 'PASS',
        precondition: ['모바일 사전조건'],
        steps: [단계(1, '모바일 절차', [['모바일 확인', 'PASS', true, true]])],
      }),
    );
    그리기(
      쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)])]),
      [
        줄(1, 'ZZI-0001', 'desktop', 'FAIL'),
        줄(2, 'ZZI-0001', 'mobile', 'PASS', { durationMs: 3600 }),
        줄(3, 'ZZI-0001', 'android', 'NA', { durationMs: null }),
        줄(9, 'ZZI-0009', 'desktop', 'PASS'),
      ],
    );

    const 모바일 = await screen.findByRole('button', { name: /ZZI-0001.*모바일/ });
    expect(모바일.getAttribute('aria-expanded')).toBe('false');
    expect(모바일.getAttribute('aria-controls')).not.toBeNull();
    expect(screen.getByText('3.60초')).toBeDefined();
    expect(screen.getByRole('button', { name: /ZZI-0001.*Android 앱/ })).toBeDefined();
    expect(screen.queryByRole('button', { name: /ZZI-0009/ })).toBeNull();
    expect(상세부름).not.toHaveBeenCalled();

    fireEvent.click(모바일);
    expect(await screen.findByText('모바일 절차')).toBeDefined();
    expect(상세부름).toHaveBeenCalledTimes(1);
    expect(상세부름).toHaveBeenCalledWith(RUN_ID, 2);
    expect(screen.getByText('모바일 사전조건')).toBeDefined();
    expect(모바일.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(모바일);
    expect(모바일.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(모바일);
    expect(모바일.getAttribute('aria-expanded')).toBe('true');
    expect(상세부름).toHaveBeenCalledTimes(1);
  });

  it('디바이스가 둘 이상인 실행이면 카드 머리에 디바이스마다 판정을 적는다 — 한 번이라도 깨졌으면 실패, 통과와 미실행이 섞이면 미실행', async () => {
    const { container } = 그리기(
      쪽([케이스('ZZI-0001', '회원가입', [장치('mobile', 2)]), 케이스('ZZI-0002', '로그인', [장치('desktop', 3)])]),
      [
        줄(1, 'ZZI-0001', 'desktop', 'PASS'),
        줄(6, 'ZZI-0001', 'desktop', 'NA', { attempt: 2 }),
        줄(2, 'ZZI-0001', 'mobile', 'FAIL'),
        줄(3, 'ZZI-0002', 'desktop', 'FAIL'),
        줄(4, 'ZZI-0002', 'desktop', 'PASS', { attempt: 2 }),
        줄(5, 'ZZI-0002', 'mobile', 'NA'),
      ],
    );
    await screen.findByText('회원가입');

    expect([...container.querySelectorAll('.fc-devs')].map((e) => e.textContent)).toEqual(['PC Not tested모바일 Fail', 'PC Fail모바일 Not tested']);
  });

  it('디바이스가 하나인 실행이면 카드 머리에 디바이스 꼬리표가 없다', async () => {
    const { container } = 그리기(쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)])]));
    await screen.findByText('회원가입');

    expect(container.querySelector('.fc-devs')).toBeNull();
  });

  it('펼친 상세를 불러오는 중이면 그 자리에 한 줄을, 못 불러오면 오류 한 줄을 적는다', async () => {
    vi.spyOn(api, 'item').mockRejectedValue(new Error('상세를 못 읽었습니다'));
    그리기(
      쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 1)])]),
      [줄(1, 'ZZI-0001', 'desktop', 'FAIL'), 줄(2, 'ZZI-0001', 'mobile', 'PASS')],
    );

    fireEvent.click(await screen.findByRole('button', { name: /ZZI-0001.*모바일/ }));
    expect(screen.getByText('불러오는 중입니다.')).toBeDefined();
    expect(await screen.findByText('상세를 못 읽었습니다')).toBeDefined();
  });

  it('카드에는 코드 뷰가 없다 — 코드는 상세에만 둔다', async () => {
    그리기(쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 17)])]));

    await screen.findByRole('link', { name: '상세' });
    expect(screen.queryByText('실패 지점 코드')).toBeNull();
  });

});

describe('묶인 칸의 화면은 실패한 절차 것만 (실행 §8.3)', () => {
  it('통과한 절차에서 찍은 화면은 「실패 시점 화면」으로 나오지 않는다', async () => {
    const 단계들 = () => [
      단계(1, '화면을 연다', [['제목이 보인다', 'PASS', '예', '예']], { screenshotPath: 'cap.png' }),
      단계(2, '가입 버튼을 누른다', [['가입한 이메일이 보인다', 'FAIL', 'new@demo.kr', '없음']], { screenshotPath: 'shot.png' }),
    ];
    그리기(
      쪽([케이스('ZZI-0001', '회원가입', [장치('desktop', 11, {}, { steps: 단계들() }), 장치('mobile', 12, {}, { steps: 단계들() })])]),
      [줄(11, 'ZZI-0001', 'desktop', 'FAIL'), 줄(12, 'ZZI-0001', 'mobile', 'FAIL')],
    );

    await screen.findByRole('article');
    const 묶음사진 = [...document.querySelectorAll('.ev-pane img')].map((img) => img.getAttribute('src'));
    expect(묶음사진).toEqual([`/api/screenshots/${RUN_ID}/11/2.png`, `/api/screenshots/${RUN_ID}/12/2.png`]);
  });
});
