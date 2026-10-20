// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './api.js';
import { RunResult } from './RunResult.js';
import { 끝난응답, RUN_ID, 실행까지 } from './RunResult.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

function 그린다(칸: { apiDocVersion?: number | null; apiDocNote?: 'DIFFERS' | 'FETCH_FAILED' | null }) {
  vi.spyOn(api, 'run').mockResolvedValue({ ...끝난응답, ...칸 });
  return render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
}

describe('실행 결과 머리 — API 문서 판 한 줄', () => {
  it('서버 문서가 판과 다르면 판 번호를 넣어 한 줄로 알린다', async () => {
    그린다({ apiDocVersion: 4, apiDocNote: 'DIFFERS' });
    expect(await screen.findByText('이 서버의 API 문서가 기준 서버 문서(버전 4)와 다릅니다. 배포 전일 수 있습니다')).toBeTruthy();
  });

  it('문서를 못 받았으면 못 받았다고만 알린다', async () => {
    그린다({ apiDocVersion: 4, apiDocNote: 'FETCH_FAILED' });
    expect(await screen.findByText('API 문서를 받지 못했습니다')).toBeTruthy();
  });

  it('null 이면 아무 줄도 없다', async () => {
    그린다({ apiDocVersion: null, apiDocNote: null });
    await screen.findByRole('button', { name: '리포트 생성' });
    expect(screen.queryByText(/API 문서/)).toBeNull();
  });
});
