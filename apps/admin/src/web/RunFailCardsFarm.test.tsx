// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';

import { RUN_ID, 그리기, 단계, 장치, 줄, 쪽, 케이스 } from './RunFailCards.fixture.js';

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
    const 로그 = screen.getByRole('link', { name: 'logcat.txt 다운로드 (10.1MB)' });
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
    expect(screen.getAllByRole('tab').map((탭) => 탭.textContent)).toEqual(['화면', '네트워크', '콘솔', 'logcat', '화면 영상', '디바이스 정보']);
    fireEvent.click(screen.getByRole('tab', { name: '화면 영상' }));
    expect(screen.getByLabelText('화면 영상 1').getAttribute('src')).toBe(`/api/runs/${String(RUN_ID)}/items/12/farm/video-1.webm`);
    fireEvent.click(screen.getByRole('tab', { name: 'logcat' }));
    expect(screen.getByRole('link', { name: 'logcat.txt 다운로드 (0.4MB)' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /video-1\.webm/ })).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: '디바이스 정보' }));
    expect(screen.getByRole('tabpanel').textContent).toBe('디바이스SM-G996NAndroid15Chrome156.0.7339.51');
  });

  it('PC 와 실제 폰이 같은 실패로 묶이면 영상 · logcat · 기기 정보에는 받아 둔 실제 폰 칸만 선다 — PC 칸은 늘 비어 있다', async () => {
    const 단계들 = () => [단계(1, '가입 버튼을 누른다', [['가입한 이메일이 보인다', 'FAIL', 'new@demo.kr', '없음']])];
    const 폰 = { farm: [{ name: 'video-1.webm', bytes: 3_100_000 }, { name: 'logcat.txt', bytes: 420_000 }], device: { model: 'SM-G996N', osVersion: '15', appVersion: null, browser: null } };
    그리기(
      쪽([케이스('ZZI-0003', '회원가입', [장치('desktop', 21, {}, { steps: 단계들() }), 장치('mobile', 22, 폰, { steps: 단계들() })])]),
      [줄(21, 'ZZI-0003', 'desktop', 'FAIL'), 줄(22, 'ZZI-0003', 'mobile', 'FAIL')],
    );

    fireEvent.click(await screen.findByRole('tab', { name: '화면 영상' }));
    expect(screen.getByRole('tabpanel').querySelectorAll('b')).toHaveLength(1);
    expect(screen.getByRole('tabpanel').textContent).not.toContain('PC');
    fireEvent.click(screen.getByRole('tab', { name: '디바이스 정보' }));
    expect(screen.getByRole('tabpanel').textContent).toBe('모바일디바이스SM-G996NAndroid15Chrome모름');
  });

  it('받은 것이 없으면 영상 · logcat 탭을 세우지 않는다', async () => {
    그리기(쪽([케이스('ZZI-0001', '결제', [장치('android', 11)])]), [줄(11, 'ZZI-0001', 'android', 'FAIL')]);
    await screen.findAllByRole('article');
    expect(screen.getAllByRole('tab').map((탭) => 탭.textContent)).toEqual(['화면']);
  });
});
