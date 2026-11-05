// @vitest-environment jsdom
// 테스트 모드 오른쪽 실시간 칸 — 장면 받기 · 기다림 · 못 닿음 · 끝난 뒤 · VISION 링크 (도메인/실행 §3.2 「테스트 모드」 · 시안 A)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

import { 장면칸, 장면통로, type 장면답 } from './TrialLive.js';

const 주소 = '/api/scenario-trials/t-1/live';
const 그림 = (): 장면답 => ({ 종류: 'frame', 그림: new Blob(['jpeg']) });
let 번호 = 0;

async function 흘리기(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  번호 = 0;
  vi.useFakeTimers();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => `blob:${++번호}`) });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const 장면 = () => screen.queryByRole('img')?.getAttribute('src') ?? null;

describe('장면칸', () => {
  it('도는 동안 0.25초마다 장면을 받아 새 그림으로 바꾸고 옛 그림은 놓는다', async () => {
    const 받기 = vi.spyOn(장면통로, '받기').mockImplementation(async () => 그림());
    render(<장면칸 주소={주소} 도는중 vision={null} />);
    await 흘리기();

    expect(받기).toHaveBeenCalledWith(주소);
    expect(장면()).toBe('blob:1');
    expect(screen.getByText('실시간 화면')).toBeTruthy();
    expect(screen.getByText('동작마다 1초 천천히')).toBeTruthy();

    await 흘리기(250);
    expect(받기).toHaveBeenCalledTimes(2);
    expect(장면()).toBe('blob:2');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1');
  });

  it('끝나면 더 묻지 않고 마지막 장면을 「마지막 화면」으로 남긴다', async () => {
    const 받기 = vi.spyOn(장면통로, '받기').mockImplementation(async () => 그림());
    const { rerender } = render(<장면칸 주소={주소} 도는중 vision={null} />);
    await 흘리기();

    rerender(<장면칸 주소={주소} 도는중={false} vision={null} />);
    await 흘리기(1000);

    expect(받기).toHaveBeenCalledTimes(1);
    expect(장면()).toBe('blob:1');
    expect(screen.getByText('마지막 화면')).toBeTruthy();
    expect(screen.queryByText('동작마다 1초 천천히')).toBeNull();
  });

  it('장면이 오기 전에는 기다린다고 알리고, 장면 없이 끝나면 칸을 그리지 않는다', async () => {
    vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'empty' });
    const { container, rerender } = render(<장면칸 주소={주소} 도는중 vision={null} />);
    await 흘리기();

    expect(screen.getByText('차례를 기다리는 중')).toBeTruthy();

    rerender(<장면칸 주소={주소} 도는중={false} vision={null} />);
    expect(container.textContent).toBe('');
  });

  it('테스트 실행기에 못 닿으면 한 줄로 알리고 2초 뒤 다시 물어 장면이 오면 걷는다', async () => {
    const 받기 = vi
      .spyOn(장면통로, '받기')
      .mockResolvedValueOnce({ 종류: 'unreachable' })
      .mockImplementation(async () => 그림());
    render(<장면칸 주소={주소} 도는중 vision={null} />);
    await 흘리기();

    const 못닿음 = '실행 서버와 연결이 끊겼습니다. 다시 연결하는 중입니다';
    expect(screen.getByText(못닿음)).toBeTruthy();

    await 흘리기(250);
    expect(받기).toHaveBeenCalledTimes(1);
    await 흘리기(1750);
    expect(받기).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(못닿음)).toBeNull();
    expect(장면()).toBe('blob:1');
  });

  it('끝난 시험이라 장면이 없다고 하면(404) 그만 묻는다', async () => {
    const 받기 = vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'gone' });
    render(<장면칸 주소={주소} 도는중 vision={null} />);
    await 흘리기(1000);

    expect(받기).toHaveBeenCalledTimes(1);
  });

  it('주소가 아직 없으면 묻지 않고 기다린다고만 알린다', async () => {
    const 받기 = vi.spyOn(장면통로, '받기');
    render(<장면칸 주소={null} 도는중 vision={null} />);
    await 흘리기(1000);

    expect(받기).not.toHaveBeenCalled();
    expect(screen.getByText('차례를 기다리는 중')).toBeTruthy();
  });

  it('VISION 이 폰을 잡으면 그 폰 화면을 새 탭으로 여는 링크를 단다', async () => {
    vi.spyOn(장면통로, '받기').mockImplementation(async () => 그림());
    render(<장면칸 주소={주소} 도는중 vision="https://vision.example/#phone=R3C&view=k1" />);
    await 흘리기();

    const 링크 = screen.getByRole('link', { name: 'Device VISION 에서 보기 ↗' });
    expect(링크.getAttribute('href')).toBe('https://vision.example/#phone=R3C&view=k1');
    expect(링크.getAttribute('target')).toBe('_blank');
    expect(링크.getAttribute('rel')).toBe('noreferrer');
  });

  it('섞인 E2E 의 앱 단계 동안에는 마지막 웹 장면을 흐리게 두고 폰에서 돈다고 알린다', async () => {
    vi.spyOn(장면통로, '받기').mockResolvedValueOnce(그림()).mockResolvedValue({ 종류: 'empty' });
    const { container } = render(<장면칸 주소={주소} 도는중 vision="https://vision.example/#phone=R3C&view=k1" />);
    await 흘리기();
    expect(container.querySelector('.live-shot.dim')).toBeNull();

    await 흘리기(250);
    expect(container.querySelector('.live-shot.dim')).not.toBeNull();
    expect(장면()).toBe('blob:1');
    expect(screen.getByText('지금은 앱 단계라 폰에서 실행 중입니다')).toBeTruthy();
  });

  it('섞인 E2E 의 앱 단계에서 폰 장면(PNG)이 오면 「폰 화면」 · 「Device VISION 폰」으로 바꾸고 1초마다 묻는다', async () => {
    const 받기 = vi
      .spyOn(장면통로, '받기')
      .mockResolvedValueOnce(그림())
      .mockResolvedValue({ 종류: 'frame', 그림: new Blob(['png'], { type: 'image/png' }) });
    render(<장면칸 주소={주소} 도는중 vision="https://vision.example/#phone=R3C&view=k1" />);
    await 흘리기();
    expect(screen.getByText('서버 브라우저')).toBeTruthy();

    await 흘리기(250);
    expect(screen.getByText('폰 화면')).toBeTruthy();
    expect(screen.getByText('Device VISION 폰')).toBeTruthy();
    expect(screen.getByRole('img').getAttribute('alt')).toBe('폰의 지금 화면');
    expect(screen.queryByText('동작마다 1초 천천히')).toBeNull();
    expect(받기).toHaveBeenCalledTimes(2);

    await 흘리기(250);
    expect(받기).toHaveBeenCalledTimes(2);
    await 흘리기(750);
    expect(받기).toHaveBeenCalledTimes(3);
  });

  it('폰을 잡았어도 첫 장면이 오기 전에는 앱 단계라고 단정하지 않는다 — 폰은 시나리오 내내 잡혀 있다', async () => {
    vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'empty' });
    render(<장면칸 주소={주소} 도는중 vision="https://vision.example/#phone=R3C&view=k1" />);
    await 흘리기();

    expect(screen.getByText('화면을 기다리고 있습니다')).toBeTruthy();
    expect(screen.queryByText('지금은 앱 단계라 폰에서 실행 중입니다')).toBeNull();
  });

  it('Android 앱 · 게임은 폰 장면을 1초마다 받아 「폰 화면」으로 그리고 VISION 링크도 단다', async () => {
    const 받기 = vi.spyOn(장면통로, '받기').mockResolvedValueOnce({ 종류: 'empty' }).mockImplementation(async () => 그림());
    const { rerender } = render(<장면칸 주소={주소} 도는중 vision={null} 폰만 />);
    await 흘리기();

    expect(screen.getByText('폰 화면')).toBeTruthy();
    expect(screen.getByText('사용할 폰을 찾는 중')).toBeTruthy();

    rerender(<장면칸 주소={주소} 도는중 vision="https://vision.example/#phone=R3C&view=k1" 폰만 />);
    expect(screen.getByText('폰 화면을 기다리고 있습니다')).toBeTruthy();
    await 흘리기(250);
    expect(받기).toHaveBeenCalledTimes(1);
    await 흘리기(750);

    expect(받기).toHaveBeenCalledTimes(2);
    expect(장면()).toBe('blob:1');
    expect(screen.getByRole('img').getAttribute('alt')).toBe('폰의 지금 화면');
    expect(screen.getByRole('link', { name: 'Device VISION 에서 보기 ↗' })).toBeTruthy();
    expect(screen.queryByText('동작마다 1초 천천히')).toBeNull();
  });

  it('모바일 웹은 폰을 잡으면 실제 폰 Chrome 장면을 「폰 화면」으로 그린다 — 앱 단계라고 하지 않는다', async () => {
    const 받기 = vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'empty' });
    const { rerender } = render(<장면칸 주소={주소} 도는중 vision={null} 모바일웹 />);
    await 흘리기();

    expect(받기).toHaveBeenCalled();
    expect(screen.getByText('차례를 기다리는 중')).toBeTruthy();

    rerender(<장면칸 주소={주소} 도는중 vision="https://vision.example/#phone=R3C&view=k1" 모바일웹 />);
    await 흘리기();
    expect(screen.getByText('폰 화면을 기다리고 있습니다')).toBeTruthy();
    받기.mockImplementation(async () => 그림());
    await 흘리기(250);

    expect(장면()).not.toBeNull();
    expect(screen.getByText('폰 화면')).toBeTruthy();
    expect(screen.getByText('실제 폰 Chrome')).toBeTruthy();
    expect(screen.getByText('동작마다 1초 천천히')).toBeTruthy();
    expect(screen.queryByText(/앱 단계/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Device VISION 에서 보기 ↗' })).toBeTruthy();
  });
});

describe('장면통로.받기', () => {
  it('응답 번호를 장면 · 없음 · 못 닿음 · 끝으로 가른다', async () => {
    const 답 = async (res: Response | Error) => {
      vi.stubGlobal('fetch', vi.fn(async () => (res instanceof Error ? Promise.reject(res) : res)));
      return (await 장면통로.받기(주소)).종류;
    };

    expect(await 답(new Response(new Uint8Array([0xff, 0xd8]), { status: 200 }))).toBe('frame');
    expect(await 답(new Response(null, { status: 204 }))).toBe('empty');
    expect(await 답(new Response('{}', { status: 502 }))).toBe('unreachable');
    expect(await 답(new Response('{}', { status: 500 }))).toBe('unreachable');
    expect(await 답(new Response('{}', { status: 404 }))).toBe('gone');
    expect(await 답(new Response('{}', { status: 401 }))).toBe('gone');
    expect(await 답(new TypeError('network'))).toBe('unreachable');
    vi.unstubAllGlobals();
  });
});
