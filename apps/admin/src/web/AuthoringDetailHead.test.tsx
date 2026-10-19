// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AuthoringRow } from './api.js';
import { AuthoringDetail } from './AuthoringDetail.js';

let 답: AuthoringRow;

vi.mock('./api.js', async () => {
  const 진짜 = await vi.importActual<typeof import('./api.js')>('./api.js');
  return {
    ...진짜,
    api: { authoringRequest: () => Promise.resolve(답), authoringAssetUrl: 진짜.api.authoringAssetUrl },
  };
});

function 줄(덮을것: Partial<AuthoringRow>): AuthoringRow {
  return {
    id: 6120,
    serviceId: 3,
    kind: 'AUTHOR',
    sourceId: null,
    status: 'DONE',
    stage: '끝',
    stageAt: new Date().toISOString(),
    requestedByName: '테스터',
    claimedBy: 'author',
    prUrl: 'https://github.com/x/y/pull/3',
    error: null,
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    ...덮을것,
  };
}

const 자료 = (id: number, name: string, position: number) => ({ id, position, kind: 'FILE' as const, name, figmaUrl: null, size: 1 });

afterEach(cleanup);

describe('작성 상세 머리와 애플리케이션 (⑫ 점검 12.14 · 12.16)', () => {
  it('제목은 넣은 자료 이름이고 번호는 부제로 내려간다', async () => {
    답 = 줄({ assets: [자료(2, '결제.pdf', 2), 자료(1, '회원가입 기획서.docx', 1)] });
    render(<AuthoringDetail service="MKT" id={6120} 할수={() => true} 서비스번호={3} 배정번호들={[3]} on서비스번호={() => {}} />);
    expect(await screen.findByRole('heading', { name: '회원가입 기획서.docx 외 1개' })).toBeTruthy();
    expect(screen.getByText(/^#6120 · /)).toBeTruthy();
  });

  it('다른 애플리케이션의 요청을 열면 띠를 그 애플리케이션으로 옮기고, 옮기기 전에는 옛 애플리케이션으로 그리지 않는다', async () => {
    답 = 줄({ serviceId: 9 });
    const 옮김 = vi.fn();
    render(<AuthoringDetail service="MKT" id={6120} 할수={() => true} 서비스번호={3} 배정번호들={[3, 9]} on서비스번호={옮김} />);
    await vi.waitFor(() => expect(옮김).toHaveBeenCalledWith(9));
    expect(screen.queryByText(/MKT/)).toBeNull();
    expect(screen.getByText('불러오는 중입니다.')).toBeTruthy();
  });

  it('배정 밖 애플리케이션의 요청이면 띠를 못 옮기니 기다리지 않고 그린다 — 「불러오는 중」에서 멈추지 않는다', async () => {
    답 = 줄({ serviceId: 9, assets: [자료(1, '결제.pdf', 1)] });
    const 옮김 = vi.fn();
    render(<AuthoringDetail service="MKT" id={6120} 할수={() => true} 서비스번호={3} 배정번호들={[3]} on서비스번호={옮김} />);
    expect(await screen.findByRole('heading', { name: '결제.pdf' })).toBeTruthy();
    expect(옮김).not.toHaveBeenCalled();
  });
});
