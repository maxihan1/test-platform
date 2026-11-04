// @vitest-environment jsdom
// 하나를 여는 일은 뒤로 가기 기록을 쌓고, 화면이 스스로 옮기는 주소는 기록을 덮고, 한 번에 떠나는지 본다 (WEB-F8-01 · 공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)

import { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import { 떠나기막기, use이동, use주소조건, 주소덮기, 주소조건, 주소쌓기 } from './leaveGuard.js';
import { route } from './route.js';

const 기다린다 = () => new Promise((끝) => setTimeout(끝, 30));

function 목록({ 듣는다 = false }: { 듣는다?: boolean }) {
  const [고른, set고른] = useState(() => 주소조건().get('run'));
  const [쪽, set쪽] = useState(() => 주소조건().get('page') ?? '1');
  use주소조건(
    '#/runs/fn',
    { ...(고른 === null ? {} : { run: 고른 }), ...(쪽 === '1' ? {} : { page: 쪽 }) },
    { 쌓는칸: ['run'], ...(듣는다 ? { 듣기: (조건: URLSearchParams) => set고른(조건.get('run')) } : {}) },
  );
  return (
    <div>
      <p data-testid="고른">{고른 ?? '없음'}</p>
      {['101', '102', '103'].map((n) => (
        <button key={n} type="button" onClick={() => set고른(n)}>
          {n}
        </button>
      ))}
      <button type="button" onClick={() => set고른(null)}>
        닫기
      </button>
      <button type="button" onClick={() => set쪽('2')}>
        2쪽
      </button>
    </div>
  );
}

let 마운트 = 0;
function 마운트셈() {
  useEffect(() => {
    마운트++;
  }, []);
  return null;
}

function 뿌리({ 듣는다 = false }: { 듣는다?: boolean }) {
  const { hash, 조건번 } = use이동();
  return route(hash).name === 'runs' ? (
    <>
      <목록 key={조건번} 듣는다={듣는다} />
      <마운트셈 key={`셈${조건번}`} />
    </>
  ) : (
    <p>다른 화면</p>
  );
}

async function 간다(해시: string) {
  const 도착 = new Promise<void>((끝) => window.addEventListener('hashchange', () => 끝(), { once: true }));
  await act(async () => {
    window.location.hash = 해시;
    await 도착;
  });
}

async function 뒤로() {
  await act(async () => {
    window.history.back();
    await 기다린다();
  });
}

const 고른 = () => screen.getByTestId('고른').textContent;

beforeEach(async () => {
  마운트 = 0;
  if (window.location.hash !== '#/start') await 간다('#/start');
});

afterEach(() => {
  떠나기막기(null);
  cleanup();
});

describe('여는 일은 기록을 쌓는다', () => {
  it('실행 101 → 102 → 103 을 누른 뒤 뒤로 가기를 하면 102 가 보인다', async () => {
    await 간다('#/runs/fn');
    render(<뿌리 />);
    for (const n of ['101', '102', '103']) fireEvent.click(screen.getByRole('button', { name: n }));
    expect(window.location.hash).toBe('#/runs/fn?run=103');

    await 뒤로();
    expect(고른()).toBe('102');
    expect(window.location.hash).toBe('#/runs/fn?run=102');
    await 뒤로();
    expect(고른()).toBe('101');
  });

  it('닫기도 쌓는다 — 닫은 뒤 뒤로 가기를 하면 연 실행이 다시 보인다', async () => {
    await 간다('#/runs/fn');
    render(<뿌리 />);
    fireEvent.click(screen.getByRole('button', { name: '101' }));
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(window.location.hash).toBe('#/runs/fn');

    await 뒤로();
    expect(고른()).toBe('101');
  });

  it('쪽 같은 조건은 쌓지 않는다 — 열린 칸에서 쪽을 넘겨도 기록은 한 칸이다', async () => {
    await 간다('#/runs/fn');
    render(<뿌리 />);
    fireEvent.click(screen.getByRole('button', { name: '101' }));
    const 길이 = window.history.length;
    fireEvent.click(screen.getByRole('button', { name: '2쪽' }));
    expect(window.location.hash).toBe('#/runs/fn?run=101&page=2');
    expect(window.history.length).toBe(길이);
  });

  it('처음 연 화면이 주소를 정리하는 것은 쌓지 않는다', async () => {
    await 간다('#/runs/fn?run=101&page=1');
    const 길이 = window.history.length;
    render(<뿌리 />);
    expect(window.history.length).toBe(길이);
    expect(window.location.hash).toBe('#/runs/fn?run=101');
  });

  it('쌓은 뒤 떠나기 막기가 걸리면 뒤로 가기가 막히고 원래 칸에 남는다', async () => {
    await 간다('#/runs/fn');
    render(<뿌리 />);
    fireEvent.click(screen.getByRole('button', { name: '101' }));
    fireEvent.click(screen.getByRole('button', { name: '102' }));
    const 막는쪽 = vi.fn();
    떠나기막기(막는쪽);
    await 뒤로();
    expect(막는쪽).toHaveBeenCalledExactlyOnceWith('#/runs/fn?run=101');
    expect(window.location.hash).toBe('#/runs/fn?run=102');
    expect(고른()).toBe('102');
  });
});

describe('한 번에 떠나는 곳', () => {
  it('메뉴로 막 연 목록에서 링크로 실행을 열고 뒤로 가기 한 번이면 링크 전 화면이다', async () => {
    await 간다('#/runs/fn');
    render(<뿌리 />);
    expect(고른()).toBe('없음');
    await 간다('#/runs/fn?run=7');
    expect(고른()).toBe('7');

    await 뒤로();
    expect(window.location.hash).toBe('#/runs/fn');
    expect(고른()).toBe('없음');
    await 뒤로();
    expect(window.location.hash).toBe('#/start');
  });

  it('메뉴를 다시 누르면(새 칸) 화면이 든 조건으로 주소를 되돌리는 것은 그대로다', async () => {
    await 간다('#/runs/fn?run=7');
    render(<뿌리 />);
    await 간다('#/runs/fn');
    expect(window.location.hash).toBe('#/runs/fn?run=7');
    expect(고른()).toBe('7');
  });
});

describe('스스로 듣는 화면', () => {
  it('뒤로 가기에도 다시 그리지 않고 듣기로 상태를 고친다', async () => {
    await 간다('#/runs/fn');
    render(<뿌리 듣는다 />);
    fireEvent.click(screen.getByRole('button', { name: '101' }));
    fireEvent.click(screen.getByRole('button', { name: '102' }));
    const 처음마운트 = 마운트;
    await 뒤로();
    expect(고른()).toBe('101');
    expect(마운트).toBe(처음마운트);
    expect(window.location.hash).toBe('#/runs/fn?run=101');
  });

  it('같은 화면 안 뒤로 가기는 떠나기 막기를 부르지 않는다', async () => {
    await 간다('#/runs/fn');
    render(<뿌리 듣는다 />);
    fireEvent.click(screen.getByRole('button', { name: '101' }));
    fireEvent.click(screen.getByRole('button', { name: '102' }));
    const 막는쪽 = vi.fn();
    떠나기막기(막는쪽);
    await 뒤로();
    expect(막는쪽).not.toHaveBeenCalled();
    expect(고른()).toBe('101');
  });
});

describe('주소쌓기 · 주소덮기', () => {
  it('주소쌓기는 한 칸 쌓고 주소덮기는 칸을 늘리지 않는다', async () => {
    await 간다('#/a');
    const 길이 = window.history.length;
    render(<뿌리 />);
    act(() => 주소쌓기('#/b'));
    expect(window.history.length).toBe(길이 + 1);
    expect(window.location.hash).toBe('#/b');
    await act(async () => {
      주소덮기('#/c');
    });
    expect(window.history.length).toBe(길이 + 1);
    expect(window.location.hash).toBe('#/c');
  });

  it('덮은 주소에서 뒤로 가기 한 번이면 덮기 전 주소가 아니라 그 앞 칸이다', async () => {
    await 간다('#/a');
    render(<뿌리 />);
    await act(async () => {
      주소덮기('#/c');
    });
    await 뒤로();
    expect(window.location.hash).toBe('#/start');
  });

  it('막기가 걸린 채 주소덮기를 하면 막는 쪽이 불리고 칸은 그대로다', async () => {
    await 간다('#/a');
    render(<뿌리 />);
    const 막는쪽 = vi.fn();
    떠나기막기(막는쪽);
    await act(async () => {
      주소덮기('#/c');
    });
    expect(막는쪽).toHaveBeenCalledExactlyOnceWith('#/c');
    expect(window.location.hash).toBe('#/a');
    떠나기막기(null);
    await 뒤로();
    expect(window.location.hash).toBe('#/start');
  });
});
