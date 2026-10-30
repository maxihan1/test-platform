// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';

import { 낮은FPS } from '../reporting/dashboardShape.js';

import { api, type ItemTrace } from './api.js';
import { 점선FPS } from './RunEvidenceParts.js';
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

  it('같은 단계를 다시 눌러도 단계 칸이 다시 깜박이고 포커스는 그 칸에 남는다', async () => {
    그리기(쪽([케이스('ZZI-0001', '장바구니', [장치('desktop', 11, {}, { steps: 화면단계들() })])]), [줄(11, 'ZZI-0001', 'desktop', 'FAIL')]);

    const 칸 = within(await screen.findByRole('group', { name: '단계 고르기' })).getByRole('button', { name: '1단계 장바구니 화면을 연다' });
    칸.focus();
    fireEvent.click(칸);
    expect(칸.className).toBe('ev-seg flash-a');
    fireEvent.click(칸);
    expect(칸.className).toBe('ev-seg flash-b');
    expect(document.activeElement).toBe(칸);
  });

  it('카드를 펼치면 항목 상세를 한 번 읽어 단계 칸 아래 요청마다 눈금을 긋고 실패한 요청은 따로 표시한다', async () => {
    const 기록들 = 기록();
    기록들.network.push({ ...기록들.network[1]!, atMs: 1520, status: 500 });
    const 읽기 = vi.spyOn(api, 'item').mockResolvedValue({ ...상세(11, 'desktop', { steps: 화면단계들() }), trace: 기록들 });
    그리기(쪽([케이스('ZZI-0001', '장바구니', [장치('desktop', 11, {}, { steps: 화면단계들() })])]), [줄(11, 'ZZI-0001', 'desktop', 'FAIL')]);

    const 접이 = (await screen.findByRole('group', { name: '단계 고르기' })).closest('details')!;
    접이.open = true;
    fireEvent(접이, new Event('toggle'));

    expect(await screen.findByText('실패한 요청')).toBeTruthy();
    const 칸들 = [...document.querySelectorAll('.ev-ticks span')];
    expect(칸들.map((칸) => 칸.querySelectorAll('i').length)).toEqual([1, 2]);
    const 둘째 = [...칸들[1]!.querySelectorAll('i')];
    expect(둘째.map((눈금) => [눈금.className, (눈금 as HTMLElement).style.left])).toEqual([
      ['', '0%'],
      ['bad', '50%'],
    ]);

    fireEvent.click(screen.getByRole('tab', { name: '네트워크' }));
    expect(await screen.findAllByText('/api/cart/items/88')).toHaveLength(2);
    expect(읽기).toHaveBeenCalledTimes(1);
  });

  it('API · 앱 케이스는 카드를 펼쳐도 항목 상세를 읽지 않고 눈금도 없다', async () => {
    const 읽기 = vi.spyOn(api, 'item');
    그리기(쪽([케이스('ZZI-0001', '주소 검색', [장치('android', 11, {}, { steps: 화면단계들() })])]), [줄(11, 'ZZI-0001', 'android', 'FAIL')]);

    const 접이 = (await screen.findByRole('group', { name: '단계 고르기' })).closest('details')!;
    접이.open = true;
    fireEvent(접이, new Event('toggle'));

    expect(읽기).not.toHaveBeenCalled();
    expect(document.querySelector('.ev-ticks')).toBeNull();
  });

  it('게임 항목은 「오브젝트」 탭에 요소 대조와 실패 순간 오브젝트 목록이 보이고 목록 파일은 logcat 받기 줄에서 빠진다 (WEB-F7-24)', async () => {
    const 받기 = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('# 장면 Shop · 화면 2340×1080 · 1개\n/Canvas/TopBar/GoldText  "10,000"'));
    const 팜 = [
      { name: 'game-tree.txt', bytes: 120 },
      { name: 'logcat.txt', bytes: 2048 },
    ];
    const 대조 = [
      { key: 'item:potion', serverValue: 10000, same: false },
      { key: 'zone:Town', serverValue: { w: 3 }, same: true },
    ];
    그리기(
      쪽([케이스('ZZI-0001', '물약 사기', [장치('android', 11, { farm: 팜, elementChecks: 대조 }, { steps: 화면단계들() })])]),
      [줄(11, 'ZZI-0001', 'android', 'FAIL')],
    );

    fireEvent.click(await screen.findByRole('tab', { name: '오브젝트' }));
    const 칸 = within(screen.getByRole('tabpanel'));
    expect(칸.getAllByRole('row').map((r) => r.textContent)).toEqual(['요소서버 값기획서와', 'item:potion10000다름', 'zone:Town{"w":3}같음']);
    expect(await 칸.findByText(/GoldText/)).toBeTruthy();
    expect(받기).toHaveBeenCalledWith(`/api/runs/${String(RUN_ID)}/items/11/farm/game-tree.txt`);

    fireEvent.click(screen.getByRole('tab', { name: 'logcat' }));
    expect(screen.getByRole('tabpanel').textContent).not.toContain('game-tree.txt');
  });

  it('단계에서 서버 API 를 부른 게임 항목도 앱 탭에 「오브젝트」 탭이 선다', async () => {
    const 단계들 = [단계(1, '골드를 읽는다', [['골드가 9,000 이다', 'FAIL', 9000, 10000]], { httpTrace: { request: { method: 'GET', url: '/admin/gold' }, response: { status: 200 } } })];
    그리기(
      쪽([케이스('ZZI-0001', '물약 사기', [장치('android', 11, { elementChecks: [{ key: 'item:potion', serverValue: 10000, same: false }] }, { steps: 단계들 })])]),
      [줄(11, 'ZZI-0001', 'android', 'FAIL')],
    );

    expect(await screen.findByRole('tab', { name: '오브젝트' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: '요청' })).toBeNull();
  });

  it('대조도 오브젝트 목록도 없는 앱 항목에는 「오브젝트」 탭이 없다', async () => {
    그리기(쪽([케이스('ZZI-0001', '주소 검색', [장치('android', 11, { elementChecks: [] }, { steps: 화면단계들() })])]), [줄(11, 'ZZI-0001', 'android', 'FAIL')]);

    await screen.findAllByRole('group', { name: '단계 고르기' });
    expect(screen.queryByRole('tab', { name: '오브젝트' })).toBeNull();
  });

  it('게임 항목은 띠 아래에 FPS 선이 단계 칸마다 그 단계 숫자로 서고 못 읽은 초에서 끊긴다 (WEB-F7-25)', async () => {
    const fps = [
      { seq: 1, fps: 60 },
      { seq: 1, fps: 60 },
      { seq: 2, fps: null },
      { seq: 2, fps: 38 },
    ];
    그리기(쪽([케이스('ZZI-0001', '물약 사기', [장치('android', 11, { fps }, { steps: 화면단계들() })])]), [줄(11, 'ZZI-0001', 'android', 'FAIL')]);

    const 선 = await screen.findByRole('img', { name: 'FPS 흐름 · 평균 53 · 가장 낮을 때 38' });
    const 칸들 = 선.querySelectorAll('span');
    expect(칸들).toHaveLength(2);
    expect(칸들[0]!.querySelector('path')!.getAttribute('d')).toMatch(/^M25\.0 [\d.]+ L75\.0 [\d.]+$/);
    expect(칸들[1]!.querySelector('path')!.getAttribute('d')).toMatch(/^M75\.0 [\d.]+$/);
    expect(screen.getByText('FPS (점선 30)')).toBeTruthy();
  });

  it('FPS 선의 점선은 대시보드가 떨어짐을 세는 선과 같다', () => {
    expect(점선FPS).toBe(낮은FPS);
  });

  it('FPS 를 안 쟀거나 다 못 읽은 항목에는 선이 없다', async () => {
    그리기(
      쪽([
        케이스('ZZI-0001', '물약 사기', [장치('android', 11, { fps: [{ seq: 1, fps: null }] }, { steps: 화면단계들() })]),
        케이스('ZZI-0002', '주소 검색', [장치('android', 12, {}, { steps: 화면단계들() })]),
      ]),
      [줄(11, 'ZZI-0001', 'android', 'FAIL'), 줄(12, 'ZZI-0002', 'android', 'FAIL')],
    );

    await screen.findAllByRole('group', { name: '단계 고르기' });
    expect(screen.queryByRole('img', { name: /FPS 흐름/ })).toBeNull();
    expect(screen.queryByText('FPS (점선 30)')).toBeNull();
  });
});
