// @vitest-environment jsdom
// 성능 AI 일 훅 검사 — 기다리는 동안 고친 입력을 지키는지 · StrictMode 개발 모드에서도 끝난 일을 받는지

import { StrictMode, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { perfApi } from './perfApi.js';
import { 묻는간격, usePerfJob } from './usePerfJob.js';

beforeEach(() => {
  묻는간격.ms = 10;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  묻는간격.ms = 3000;
});

function 화면() {
  const [값, set값] = useState({ 이름: '처음', 결과: '' });
  const 일 = usePerfJob<string>((out) => set값({ ...값, 결과: out }));
  return (
    <>
      <input aria-label="이름" value={값.이름} onChange={(e) => set값({ ...값, 이름: e.target.value })} />
      <button type="button" onClick={() => void 일.맡기기(() => Promise.resolve({ jobId: 7 }))}>
        맡기기
      </button>
      <output>{값.결과}</output>
    </>
  );
}

describe('usePerfJob', () => {
  it('AI 일을 기다리는 동안 고친 입력은 일이 끝난 뒤에도 남는다', async () => {
    let 끝남 = false;
    const 묻기 = vi.spyOn(perfApi, 'job').mockImplementation(() => Promise.resolve(끝남 ? { id: 7, status: 'DONE', output: 'AI 결과' } : { id: 7, status: 'RUNNING' }) as never);
    render(<화면 />);
    fireEvent.click(screen.getByRole('button', { name: '맡기기' }));
    await waitFor(() => expect(묻기).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '고친 이름' } });
    끝남 = true;

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('AI 결과'));
    expect((screen.getByLabelText('이름') as HTMLInputElement).value).toBe('고친 이름');
  });

  it('StrictMode 개발 모드에서도 끝난 일을 화면에 넣는다', async () => {
    vi.spyOn(perfApi, 'job').mockResolvedValue({ id: 7, status: 'DONE', output: 'AI 결과' } as never);
    render(
      <StrictMode>
        <화면 />
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole('button', { name: '맡기기' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('AI 결과'));
  });
});
