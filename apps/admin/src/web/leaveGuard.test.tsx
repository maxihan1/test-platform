// @vitest-environment jsdom
// 저장 안 한 조립을 두고 해시를 옮기면 화면이 바뀌기 전에 막는지 본다 (명세 시나리오 §8.11)

import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

import { useBeforeUnload, useHash, 떠나기로했다, 떠나기막기 } from './leaveGuard.js';

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
