// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';

import { RUN_ID, 그리기, 장치, 줄, 쪽, 케이스 } from './RunFailCards.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('실패 카드의 팜 화면 영상 · logcat (도메인/러너 §5.2)', () => {
  it('영상은 누르기 전에 받지 않는 재생 칸으로, logcat 은 크기를 단 받기 링크로 증거 칸 탭에 붙인다', async () => {
    const farm = [
      { name: 'logcat.txt', bytes: 10_631_002 },
      { name: 'video-1.mp4', bytes: 103_042_030 },
      { name: 'video-2.mp4', bytes: 2_428_030 },
    ];
    그리기(쪽([케이스('ZZI-0001', '결제', [장치('android', 11, { farm })])]), [줄(11, 'ZZI-0001', 'android', 'FAIL')]);

    fireEvent.click(await screen.findByRole('tab', { name: '화면 영상' }));
    const 첫영상 = screen.getByLabelText('화면 영상 1');
    expect(첫영상.getAttribute('src')).toBe(`/api/runs/${String(RUN_ID)}/items/11/farm/video-1.mp4`);
    expect(첫영상.getAttribute('preload')).toBe('none');
    expect(screen.getByLabelText('화면 영상 2')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'logcat' }));
    const 로그 = screen.getByRole('link', { name: 'logcat.txt 받기 (10.1MB)' });
    expect(로그.getAttribute('href')).toBe(`/api/runs/${String(RUN_ID)}/items/11/farm/logcat.txt`);
  });

  it('실제 폰 모바일 항목은 웹 탭 뒤에 logcat · 화면 영상(.webm) · 기기 정보가 서고 기기 정보는 앱 버전 대신 Chrome 판이다', async () => {
    const farm = [
      { name: 'logcat.txt', bytes: 420_000 },
      { name: 'video-1.webm', bytes: 3_100_000 },
    ];
    const device = { model: 'SM-G996N', osVersion: '15', appVersion: null, browser: '156.0.7339.51' };
    그리기(쪽([케이스('ZZI-0002', '장바구니', [장치('mobile', 12, { farm, device })])]), [줄(12, 'ZZI-0002', 'mobile', 'FAIL')]);

    await screen.findAllByRole('article');
    expect(screen.getAllByRole('tab').map((탭) => 탭.textContent)).toEqual(['화면', '네트워크', '콘솔', 'logcat', '화면 영상', '기기 정보']);
    fireEvent.click(screen.getByRole('tab', { name: '화면 영상' }));
    expect(screen.getByLabelText('화면 영상 1').getAttribute('src')).toBe(`/api/runs/${String(RUN_ID)}/items/12/farm/video-1.webm`);
    fireEvent.click(screen.getByRole('tab', { name: 'logcat' }));
    expect(screen.getByRole('link', { name: 'logcat.txt 받기 (0.4MB)' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /video-1\.webm/ })).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: '기기 정보' }));
    expect(screen.getByRole('tabpanel').textContent).toBe('기기SM-G996NAndroid15Chrome156.0.7339.51');
  });

  it('받은 것이 없으면 영상 · logcat 탭을 세우지 않는다', async () => {
    그리기(쪽([케이스('ZZI-0001', '결제', [장치('android', 11)])]), [줄(11, 'ZZI-0001', 'android', 'FAIL')]);
    await screen.findAllByRole('article');
    expect(screen.getAllByRole('tab').map((탭) => 탭.textContent)).toEqual(['화면']);
  });
});
