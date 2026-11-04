// @vitest-environment jsdom
// 마법사 단계 주소 훅 — 검사에 걸린 이동은 실제 단계로 덮어쓰고, 마법사가 스스로 옮기는 단계는 쌓지 않는다 (WEB-F8-01)

import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { use단계주소 } from './useWizardStep.js';

// 앞으로 갈 수 있는 가장 먼 단계. 마법사의 단계 검사가 정한다
let 허용 = 3;

function 마법사() {
  const [지금, set지금] = useState(0);
  const 스스로 = use단계주소(지금, (i) => {
    const 갈곳 = i <= 지금 ? i : Math.min(i, Math.max(지금, 허용));
    if (갈곳 !== 지금) set지금(갈곳);
    return 갈곳;
  });
  return (
    <div>
      <p data-testid="단계">{지금}</p>
      <button type="button" onClick={() => set지금(지금 + 1)}>
        다음
      </button>
      <button
        type="button"
        onClick={() => {
          스스로(0);
          set지금(0);
        }}
      >
        처음으로
      </button>
    </div>
  );
}

const 단계 = () => screen.getByTestId('단계').textContent;
const 다음 = () => fireEvent.click(screen.getByRole('button', { name: '다음' }));

async function 주소로(해시: string) {
  const 도착 = new Promise<void>((끝) => window.addEventListener('hashchange', () => 끝(), { once: true }));
  await act(async () => {
    window.location.hash = 해시;
    await 도착;
  });
}

beforeEach(async () => {
  허용 = 3;
  window.history.replaceState(null, '', '#/wiz/new');
});
afterEach(cleanup);

describe('use단계주소', () => {
  it('앞으로 가는 주소는 검사를 통과하는 가장 먼 단계까지만 가고 주소는 실제 단계로 덮어쓴다', async () => {
    render(<마법사 />);
    허용 = 1;
    await 주소로('#/wiz/new?step=3');
    await waitFor(() => expect(단계()).toBe('1'));
    expect(window.location.hash).toBe('#/wiz/new?step=1');
  });

  it('검사에 걸려 아무 데도 못 가면 주소를 지금 단계로 되돌리고, 다음 실제 단계 바꿈은 기록을 쌓는다', async () => {
    render(<마법사 />);
    허용 = 0;
    await 주소로('#/wiz/new?step=7');
    expect(단계()).toBe('0');
    expect(window.location.hash).toBe('#/wiz/new');

    const 길이 = window.history.length;
    다음();
    expect(window.location.hash).toBe('#/wiz/new?step=1');
    expect(window.history.length).toBe(길이 + 1);
  });

  it('마법사가 스스로 옮기는 단계는 쌓지 않고 덮어쓴다 — 사람이 누른 다음만 쌓는다', () => {
    render(<마법사 />);
    다음();
    다음();
    const 길이 = window.history.length;
    expect(window.location.hash).toBe('#/wiz/new?step=2');

    fireEvent.click(screen.getByRole('button', { name: '처음으로' }));
    expect(window.location.hash).toBe('#/wiz/new');
    expect(window.history.length).toBe(길이);
  });

  it('스스로 옮기려던 곳이 지금 단계면 표시가 남지 않아 다음 사람 이동은 쌓인다', () => {
    render(<마법사 />);
    fireEvent.click(screen.getByRole('button', { name: '처음으로' }));
    const 길이 = window.history.length;
    다음();
    expect(window.history.length).toBe(길이 + 1);
  });
});
