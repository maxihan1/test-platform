// @vitest-environment jsdom
// 증적 칸 — 만들기를 누르면 끝난 뒤 저절로 받아지고, 같은 형식의 문서 줄은 가장 새 것 하나만 남는다 (도메인/리포팅 §8.4 · 점검 2.18)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';

import { api, type EvidenceRow } from './api.js';
import { use증적, 증적만들기버튼들, 증적알림과목록 } from './EvidenceSection.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 행 = (id: number, format: string, status: string): EvidenceRow => ({
  id,
  format,
  status,
  filePath: status === 'READY' ? `/x/${String(id)}` : null,
  error: null,
  generatedAt: '2026-10-19T00:00:00.000Z',
});

function 화면({ 처음, 다음 }: { 처음: EvidenceRow[]; 다음?: EvidenceRow[] }) {
  const [문서들, set문서들] = useState(처음);
  const 칸 = use증적({ runId: 7, status: 'FINISHED', evidence: 문서들 }, () => true, () => {
    if (다음 !== undefined) set문서들(다음);
  });
  return (
    <>
      <증적만들기버튼들 칸={칸} />
      <증적알림과목록 칸={칸} 한줄로 />
    </>
  );
}

describe('use증적', () => {
  it('PDF 만들기를 누르면 문서가 READY 가 된 뒤 목록 줄을 누르지 않아도 받아진다', async () => {
    const 누름 = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(api, 'makeEvidence').mockResolvedValue(행(11, 'PDF', 'PENDING'));
    render(<화면 처음={[]} 다음={[행(11, 'PDF', 'READY')]} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'PDF 만들기' }));
    });

    expect(누름).toHaveBeenCalledTimes(1);
  });

  it('아직 만드는 중이면 받지 않는다', async () => {
    const 누름 = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(api, 'makeEvidence').mockResolvedValue(행(11, 'PDF', 'PENDING'));
    render(<화면 처음={[]} 다음={[행(11, 'PDF', 'PENDING')]} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'PDF 만들기' }));
    });

    expect(누름).not.toHaveBeenCalled();
  });

  it('만들기가 실패로 끝나면 받지 않는다', async () => {
    const 누름 = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(api, 'makeEvidence').mockResolvedValue(행(11, 'PDF', 'PENDING'));
    render(<화면 처음={[]} 다음={[행(11, 'PDF', 'FAILED')]} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'PDF 만들기' }));
    });

    expect(누름).not.toHaveBeenCalled();
  });

  it('같은 형식을 여러 번 만들어도 문서 줄은 형식마다 가장 새 것 하나만 둔다', () => {
    render(<화면 처음={[행(1, 'PDF', 'READY'), 행(2, 'PDF', 'READY'), 행(3, 'XLSX', 'READY')]} />);

    expect(screen.getAllByText(/만듦/)).toHaveLength(2);
    const 고리들 = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(고리들).toEqual([api.evidenceUrl(3), api.evidenceUrl(2)]);
  });
});
