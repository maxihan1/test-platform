// @vitest-environment jsdom
// 윈도우 PC 화면 영상 칸 — 흐름을 받아 설정 · 키프레임부터 풀고, 끝나면 다시 붙고, 못 푸는 브라우저는 안내한다 (도메인/게임 §3.10 「증적 · 결과」)

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PC화면, PC화면통로 } from './PcScreen.js';

const SPS설정 = [0, 0, 0, 1, 0x67, 0x64, 0x00, 0x1f, 0xac, 0, 0, 1, 0x68, 0xee];

function 길이붙인조각(종류: number, 영상: number[]): Uint8Array {
  const b = new Uint8Array(4 + 9 + 영상.length);
  const v = new DataView(b.buffer);
  v.setUint32(0, 9 + 영상.length);
  b[4] = 종류;
  v.setFloat64(5, 40);
  b.set(영상, 13);
  return b;
}

/** 읽을 때마다 하나씩 주고, 다 주면 끝난다 */
function 흐름(조각들: Uint8Array[]): Response {
  const 남은 = [...조각들];
  return {
    ok: true,
    body: { getReader: () => ({ read: async () => (남은.length === 0 ? { done: true, value: undefined } : { done: false, value: 남은.shift()! }) }) },
  } as unknown as Response;
}

class 가짜풀개 {
  static 모두: 가짜풀개[] = [];
  state = 'unconfigured';
  설정: unknown;
  푼것: { type: string; data: number[] }[] = [];
  constructor(public 콜백: { output: (장: unknown) => void; error: () => void }) {
    가짜풀개.모두.push(this);
  }
  configure(설정: unknown) {
    this.설정 = 설정;
    this.state = 'configured';
  }
  decode(장: { type: string; data: Uint8Array }) {
    this.푼것.push({ type: 장.type, data: [...장.data] });
  }
  close() {
    this.state = 'closed';
  }
}

class 가짜조각 {
  type: string;
  data: Uint8Array;
  constructor(init: { type: string; data: Uint8Array }) {
    this.type = init.type;
    this.data = new Uint8Array(init.data);
  }
}

beforeEach(() => {
  가짜풀개.모두 = [];
  vi.useFakeTimers();
  vi.stubGlobal('VideoDecoder', 가짜풀개);
  vi.stubGlobal('EncodedVideoChunk', 가짜조각);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function 흘리기(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('PC화면', () => {
  it('설정 조각으로 풀개를 맞추고, 설정을 첫 키프레임 앞에 붙여 푼다 — 설정 뒤 키프레임 전 델타는 버린다', async () => {
    const 설정 = 길이붙인조각(2, SPS설정);
    // 조각 경계가 읽기 경계와 어긋나도 이어 가른다
    vi.spyOn(PC화면통로, '받기').mockResolvedValue(흐름([설정.subarray(0, 6), 설정.subarray(6), 길이붙인조각(0, [5]), 길이붙인조각(1, [7, 7]), 길이붙인조각(0, [8])]));
    render(<PC화면 주소="/api/runs/1/items/2/pc-screen" 기다림글="게임을 여는 중" />);
    await 흘리기();

    const 풀개 = 가짜풀개.모두[0]!;
    expect(풀개.설정).toEqual({ codec: 'avc1.64001f', optimizeForLatency: true });
    expect(풀개.푼것).toEqual([
      { type: 'key', data: [...SPS설정, 7, 7] },
      { type: 'delta', data: [8] },
    ]);
  });

  it('첫 장을 그리면 기다림 글을 걷고 canvas 를 그 장 크기로 맞춘다', async () => {
    const 그리기 = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: 그리기 } as never);
    vi.spyOn(PC화면통로, '받기').mockResolvedValue(흐름([길이붙인조각(2, SPS설정)]));
    render(<PC화면 주소="/x" 기다림글="게임을 여는 중" />);
    await 흘리기();
    expect(screen.getByText('게임을 여는 중')).toBeTruthy();

    const 닫기 = vi.fn();
    await act(async () => {
      가짜풀개.모두[0]!.콜백.output({ displayWidth: 1920, displayHeight: 1080, close: 닫기 });
    });

    const 판 = document.querySelector('canvas')!;
    expect([판.width, 판.height]).toEqual([1920, 1080]);
    expect(그리기).toHaveBeenCalled();
    expect(닫기).toHaveBeenCalled();
    expect(screen.queryByText('게임을 여는 중')).toBeNull();
  });

  it('흐름이 끝나면 2초 뒤 다시 붙고, 칸이 내려가면 받던 것을 끊는다', async () => {
    const 신호들: AbortSignal[] = [];
    const 받기 = vi.spyOn(PC화면통로, '받기').mockImplementation(async (_주소, 신호) => {
      신호들.push(신호);
      return 흐름([]);
    });
    const { unmount } = render(<PC화면 주소="/x" 기다림글="게임을 여는 중" />);
    await 흘리기();
    expect(받기).toHaveBeenCalledTimes(1);
    await 흘리기(2_000);
    expect(받기).toHaveBeenCalledTimes(2);

    unmount();
    expect(신호들.at(-1)!.aborted).toBe(true);
    await 흘리기(5_000);
    expect(받기).toHaveBeenCalledTimes(2);
  });

  it('영상을 못 푸는 브라우저는 받지 않고 다른 브라우저로 열라고 안내한다', () => {
    vi.stubGlobal('VideoDecoder', undefined);
    const 받기 = vi.spyOn(PC화면통로, '받기');
    render(<PC화면 주소="/x" 기다림글="게임을 여는 중" />);
    expect(screen.getByText('이 브라우저에서는 PC 화면을 볼 수 없습니다. Chrome 이나 Edge 로 여세요')).toBeTruthy();
    expect(받기).not.toHaveBeenCalled();
  });
});
