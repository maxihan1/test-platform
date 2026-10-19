// @vitest-environment jsdom
// 저장 안 한 조립을 두고 해시를 옮기면 화면이 바뀌기 전에 막는지 본다 (명세 시나리오 §8.11)

import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import { useBeforeUnload, useHash, 떠나기로했다, 떠나기막기, 떠나기상자, 버리기전, 주소고치기, 주소조건 } from './leaveGuard.js';

function 보는것() {
  const hash = useHash();
  return <p data-testid="hash">{hash}</p>;
}

function 거는것({ 막는쪽 }: { 막는쪽: (갈곳: string) => void }) {
  useEffect(() => {
    떠나기막기(막는쪽);
    return () => 떠나기막기(null);
  }, [막는쪽]);
  return null;
}

function 닫기막는것({ 막나 }: { 막나: boolean }) {
  useBeforeUnload(막나);
  return null;
}

async function 옮긴다(해시: string) {
  const 도착 = new Promise<void>((끝) => window.addEventListener('hashchange', () => 끝(), { once: true }));
  await act(async () => {
    window.location.hash = 해시;
    await 도착;
  });
}

const 화면해시 = () => screen.getByTestId('hash').textContent;
const 기다린다 = () => new Promise((끝) => setTimeout(끝, 30));

beforeEach(async () => {
  if (window.location.hash === '#/a') return;
  const 도착 = new Promise<void>((끝) => window.addEventListener('hashchange', () => 끝(), { once: true }));
  window.location.hash = '#/a';
  await 도착;
});

afterEach(() => {
  떠나기막기(null);
  cleanup();
});

describe('useHash', () => {
  it('막기가 없으면 그린 해시가 바뀐다', async () => {
    render(<보는것 />);
    await 옮긴다('#/b');
    expect(화면해시()).toBe('#/b');
  });

  it('막기를 걸면 화면은 그대로이고 주소가 되돌아가며 막는 쪽이 갈 곳을 받는다', async () => {
    const 막는쪽 = vi.fn();
    render(<보는것 />);
    떠나기막기(막는쪽);
    const 길이 = window.history.length;
    await 옮긴다('#/b');
    expect(화면해시()).toBe('#/a');
    expect(window.location.hash).toBe('#/a');
    expect(막는쪽).toHaveBeenCalledExactlyOnceWith('#/b');
    expect(window.history.length).toBe(길이 + 1);
  });

  it('되돌린 뒤 같은 해시 메아리는 막는 쪽을 다시 부르지 않는다', async () => {
    const 막는쪽 = vi.fn();
    render(<보는것 />);
    떠나기막기(막는쪽);
    await 옮긴다('#/b');
    await act(async () => {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(막는쪽).toHaveBeenCalledTimes(1);
    expect(화면해시()).toBe('#/a');
  });

  it('주소 이동이 막힌 뒤 뒤로 가기 한 번이면 다시 막는 쪽이 이전 주소를 받는다', async () => {
    const 막는쪽 = vi.fn();
    render(<보는것 />);
    await 옮긴다('#/p');
    떠나기막기(막는쪽);
    await 옮긴다('#/b');
    await 기다린다();
    await act(async () => {
      window.history.back();
      await 기다린다();
    });
    expect(막는쪽).toHaveBeenLastCalledWith('#/a');
    expect(화면해시()).toBe('#/p');
  });

  it('뒤로 가기가 막히면 그 칸을 덮지 않고 원래 칸으로 돌아온다', async () => {
    const 막는쪽 = vi.fn();
    render(<보는것 />);
    await 옮긴다('#/p');
    떠나기막기(막는쪽);
    await act(async () => {
      window.history.back();
      await 기다린다();
    });
    expect(막는쪽).toHaveBeenCalledExactlyOnceWith('#/a');
    expect(window.location.hash).toBe('#/p');
    떠나기막기(null);
    await act(async () => {
      window.history.back();
      await 기다린다();
    });
    expect(화면해시()).toBe('#/a');
  });

  it('떠나기로했다 뒤 한 번은 지나가고 그다음은 다시 막힌다', async () => {
    const 막는쪽 = vi.fn();
    render(<보는것 />);
    떠나기막기(막는쪽);
    떠나기로했다();
    await 옮긴다('#/b');
    expect(화면해시()).toBe('#/b');
    expect(막는쪽).not.toHaveBeenCalled();
    await 옮긴다('#/c');
    expect(화면해시()).toBe('#/b');
    expect(막는쪽).toHaveBeenCalledExactlyOnceWith('#/c');
  });

  it('null 로 풀면 지나간다', async () => {
    const 막는쪽 = vi.fn();
    render(<보는것 />);
    떠나기막기(막는쪽);
    떠나기막기(null);
    await 옮긴다('#/b');
    expect(화면해시()).toBe('#/b');
    expect(막는쪽).not.toHaveBeenCalled();
  });

  it('막기를 건 컴포넌트가 사라지면 풀려 지나간다', async () => {
    const 막는쪽 = vi.fn();
    render(<보는것 />);
    const 건것 = render(<거는것 막는쪽={막는쪽} />);
    건것.unmount();
    await 옮긴다('#/b');
    expect(화면해시()).toBe('#/b');
    expect(막는쪽).not.toHaveBeenCalled();
  });
});

describe('useBeforeUnload', () => {
  const 닫아본다 = () => {
    const 이벤트 = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(이벤트);
    return 이벤트.defaultPrevented;
  };

  it('참이면 창 닫기를 막는다', () => {
    render(<닫기막는것 막나 />);
    expect(닫아본다()).toBe(true);
  });

  it('거짓이면 막지 않는다', () => {
    render(<닫기막는것 막나={false} />);
    expect(닫아본다()).toBe(false);
  });

  it('사라지면 막지 않는다', () => {
    const 건것 = render(<닫기막는것 막나 />);
    건것.unmount();
    expect(닫아본다()).toBe(false);
  });
});

describe('주소고치기 · 주소조건', () => {
  it('방문 기록을 쌓지 않고 주소만 고치며 그린 해시는 그대로다', async () => {
    render(<보는것 />);
    const 길이 = window.history.length;
    주소고치기('#/a?q=로그인&page=2');
    expect(window.location.hash).toBe(`#/a?${new URLSearchParams({ q: '로그인', page: '2' })}`);
    expect(window.history.length).toBe(길이);
    expect(화면해시()).toBe('#/a');
    expect(주소조건().get('q')).toBe('로그인');
    expect(주소조건().get('page')).toBe('2');
  });

  it('막혀서 되돌아올 때 고쳐 둔 조건이 주소에 남는다', async () => {
    const 막는쪽 = vi.fn();
    render(<보는것 />);
    주소고치기('#/a?page=2');
    떠나기막기(막는쪽);
    await 옮긴다('#/b');
    expect(window.location.hash).toBe('#/a?page=2');
    expect(막는쪽).toHaveBeenCalledExactlyOnceWith('#/b');
  });
});

describe('떠나기상자 · 버리기전', () => {
  it('막는 쪽이 없으면 버리기전은 바로 한다', () => {
    const 한다 = vi.fn();
    버리기전(한다);
    expect(한다).toHaveBeenCalledOnce();
  });

  it('주소를 옮기려 하면 상자가 뜨고, 머무르면 그대로 · 떠나면 그 주소로 간다', async () => {
    render(
      <>
        <보는것 />
        <떠나기상자 막나 />
      </>,
    );
    await 옮긴다('#/b');
    expect(화면해시()).toBe('#/a');
    fireEvent.click(screen.getByRole('button', { name: '머무르기' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(화면해시()).toBe('#/a');

    await 옮긴다('#/b');
    const 도착 = new Promise<void>((끝) => window.addEventListener('hashchange', () => 끝(), { once: true }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '저장하지 않고 떠나기' }));
      await 도착;
    });
    expect(화면해시()).toBe('#/b');
  });

  it('버리기도를 켜면 버리기전도 묻고, 떠나기를 눌러야 그 일을 한다', () => {
    const 한다 = vi.fn();
    render(<떠나기상자 막나 버리기도 />);
    act(() => 버리기전(한다));
    expect(screen.getByRole('dialog', { name: '저장 안 된 변경 있음' })).toBeTruthy();
    expect(한다).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '저장하지 않고 떠나기' }));
    expect(한다).toHaveBeenCalledOnce();
  });

  it('버리기도를 안 켜면 버리기전은 묻지 않는다 — 조립 화면은 애플리케이션을 바꿔도 초안이 남는다', () => {
    const 한다 = vi.fn();
    render(<떠나기상자 막나 />);
    버리기전(한다);
    expect(한다).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('막을 것이 없으면 묻지 않는다', async () => {
    const 한다 = vi.fn();
    render(
      <>
        <보는것 />
        <떠나기상자 막나={false} 버리기도 />
      </>,
    );
    버리기전(한다);
    await 옮긴다('#/b');
    expect(한다).toHaveBeenCalledOnce();
    expect(화면해시()).toBe('#/b');
  });
});

describe('떠나기상자 여럿', () => {
  it('하나가 내려가도 남은 상자가 계속 묻는다', async () => {
    const 첫 = render(<떠나기상자 막나 />);
    render(
      <>
        <보는것 />
        <떠나기상자 막나 />
      </>,
    );
    첫.unmount();
    await 옮긴다('#/b');
    expect(화면해시()).toBe('#/a');
    expect(screen.getByRole('dialog', { name: '저장 안 된 변경 있음' })).toBeTruthy();
  });

  it('열쇠를 주면 그 열쇠의 상자만 묻는다', () => {
    const 한다 = vi.fn();
    render(
      <>
        <떠나기상자 막나 버리기도 />
        <떠나기상자 막나 버리기도 열쇠="R-2" />
      </>,
    );
    버리기전(한다, 'R-1');
    expect(한다).toHaveBeenCalledOnce();
    act(() => 버리기전(한다, 'R-2'));
    expect(screen.getByRole('dialog', { name: '저장 안 된 변경 있음' })).toBeTruthy();
    expect(한다).toHaveBeenCalledOnce();
  });
});
