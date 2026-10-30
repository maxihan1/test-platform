// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';

import { api, type ItemTrace } from './api.js';
import { RUN_ID, 그리기, 단계, 상세, 장치, 줄, 쪽, 케이스 } from './RunFailCards.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 화면단계들 = () => [
  단계(1, '장바구니 화면을 연다', [['상품 줄이 보인다', 'PASS', '보임', '보임']], { screenshotPath: 'cap.png', durationMs: 1000 }),
  단계(2, '수량을 0으로 바꾼다', [['상품 줄이 사라진다', 'FAIL', '사라짐', '남아 있음']], { screenshotPath: 'shot.png', durationMs: 3000 }),
];

const 기록 = (): ItemTrace => ({
  status: 'DONE',
  reason: null,
  network: [
    { seq: 1, atMs: 10, method: 'GET', url: '/api/cart', status: 200, resourceType: 'fetch', durationMs: 88, failure: null, requestBody: null, responseBody: null },
    { seq: 2, atMs: 20, method: 'PATCH', url: '/api/cart/items/88', status: 200, resourceType: 'fetch', durationMs: 120, failure: null, requestBody: null, responseBody: null },
  ],
  actions: [],
  console: [{ seq: 2, atMs: 30, level: 'warning', text: 'unique key 경고', url: null }],
});

describe('실패 카드의 시간축 증거 (WEB-F7-13)', () => {
  it('처음에는 깨진 단계를 고르고, 띠에서 다른 단계를 누르면 증거 칸 화면이 그 단계 것으로 바뀐다', async () => {
    그리기(쪽([케이스('ZZI-0001', '장바구니', [장치('desktop', 11, {}, { steps: 화면단계들() })])]), [줄(11, 'ZZI-0001', 'desktop', 'FAIL')]);

    const 띠 = within(await screen.findByRole('group', { name: '단계 고르기' }));
    expect(띠.getByRole('button', { name: '2단계 수량을 0으로 바꾼다' }).getAttribute('aria-pressed')).toBe('true');
    expect(within(screen.getByRole('tabpanel')).getByRole('img').getAttribute('alt')).toBe('수량을 0으로 바꾼다 실패 시점 화면');

    fireEvent.click(띠.getByRole('button', { name: '1단계 장바구니 화면을 연다' }));
    const 사진 = within(screen.getByRole('tabpanel')).getByRole('img');
    // 통과한 단계에서 찍은 화면을 「실패 시점 화면」이라 부르지 않는다
    expect(사진.getAttribute('alt')).toBe('장바구니 화면을 연다 화면');
    expect(사진.getAttribute('src')).toBe(`/api/screenshots/${String(RUN_ID)}/11/1.png`);
  });

  it('네트워크 · 콘솔 탭은 처음 누를 때 항목 상세를 한 번만 읽고 고른 단계의 줄만 보인다', async () => {
    const 읽기 = vi.spyOn(api, 'item').mockResolvedValue({ ...상세(11, 'desktop', { steps: 화면단계들() }), trace: 기록() });
    그리기(쪽([케이스('ZZI-0001', '장바구니', [장치('desktop', 11, {}, { steps: 화면단계들() })])]), [줄(11, 'ZZI-0001', 'desktop', 'FAIL')]);

    await screen.findByRole('group', { name: '단계 고르기' });
    expect(읽기).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('tab', { name: '네트워크' }));
    expect(await screen.findByText('/api/cart/items/88')).toBeTruthy();
    expect(screen.queryByText('/api/cart')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '1단계 장바구니 화면을 연다' }));
    expect(await screen.findByText('/api/cart')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: '콘솔' }));
    expect(screen.getByText('보일 줄이 없습니다')).toBeTruthy();
    expect(읽기).toHaveBeenCalledTimes(1);
  });

  it('API 케이스는 요청 · 응답 · 기대값 차이 탭이고 고른 단계 것을 보인다', async () => {
    const 단계들 = [
      단계(1, '토큰을 받는다', [['상태 코드가 200 이다', 'PASS', 200, 200]], { httpTrace: { request: { url: '/token' }, response: { status: 200 } } }),
      단계(2, '빈 제목으로 알림을 만든다', [['상태 코드가 400 이다', 'FAIL', 400, 500]], {
        httpTrace: { request: { url: '/v1/notifications', body: { title: '' } }, response: { status: 500 } },
      }),
    ];
    그리기(쪽([케이스('ZZI-0001', '알림 만들기', [장치('desktop', 11, {}, { steps: 단계들 })])]), [줄(11, 'ZZI-0001', 'desktop', 'FAIL')]);

    const 탭들 = await screen.findAllByRole('tab');
    expect(탭들.map((탭) => 탭.textContent)).toEqual(['요청', '응답', '기대값 차이']);
    expect(screen.getByRole('tabpanel').textContent).toContain('/v1/notifications');

    fireEvent.click(screen.getByRole('tab', { name: '기대값 차이' }));
    const 줄들 = within(screen.getByRole('tabpanel')).getAllByRole('row');
    expect(줄들.map((r) => r.textContent)).toEqual(['확인기대실제', '상태 코드가 400 이다400500']);

    fireEvent.click(screen.getByRole('button', { name: '1단계 토큰을 받는다' }));
    expect(screen.getByText('이 단계는 기대값과 다른 곳이 없습니다')).toBeTruthy();
  });

  it('앱 항목은 판을 읽었을 때만 「기기 정보」 탭이 서고 못 읽은 칸은 「모름」이다', async () => {
    const 판 = { model: 'SM-S911N', osVersion: '14', appVersion: null, appBuild: '241' };
    그리기(쪽([케이스('ZZI-0001', '주소 검색', [장치('android', 11, { device: 판 }, { steps: 화면단계들() })])]), [줄(11, 'ZZI-0001', 'android', 'FAIL')]);

    fireEvent.click(await screen.findByRole('tab', { name: '기기 정보' }));
    expect(screen.getByRole('tabpanel').textContent).toBe('기기SM-S911NAndroid14앱 버전빌드 241');
  });

  it('판을 못 읽은 앱 항목 · 웹 항목에는 「기기 정보」 탭이 없다', async () => {
    그리기(
      쪽([
        케이스('ZZI-0001', '주소 검색', [장치('android', 11, { device: null }, { steps: 화면단계들() })]),
        케이스('ZZI-0002', '장바구니', [장치('desktop', 12, {}, { steps: 화면단계들() })]),
      ]),
      [줄(11, 'ZZI-0001', 'android', 'FAIL'), 줄(12, 'ZZI-0002', 'desktop', 'FAIL')],
    );

    await screen.findAllByRole('group', { name: '단계 고르기' });
    expect(screen.queryByRole('tab', { name: '기기 정보' })).toBeNull();
  });
});
