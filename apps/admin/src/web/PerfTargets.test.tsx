// @vitest-environment jsdom
// 부하 · 기기 성능 목표와 트랜잭션 줄을 지울 때, AI 추천이 적은 목표를 바꿀 때 묻는지 검사 (도메인/성능 §8.14)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

import type { ServiceRow } from './api.js';
import { perfApi, type Target } from './perfApi.js';
import { PerfDeviceTargets } from './PerfDeviceTargets.js';
import { 기본목표 } from './perfDeviceView.js';
import { PerfStepScenario, type 일단계값 } from './PerfStepScenario.js';
import { PerfStepTargets, type 삼단계값 } from './PerfStepTargets.js';
import { 물음누름 } from './startConfirm.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 목표 = (value: number): Target => ({ metric: 'P95', op: '<=', value, source: 'MANUAL' });

function 목표칸({ 처음, 저장 }: { 처음: Target[]; 저장: () => Promise<number | null> }) {
  const [값, set값] = useState<삼단계값>({ targets: 처음, aiBasis: [], degradeAlert: false });
  return <PerfStepTargets 값={값} 고침={set값} serviceId={7} 트랜잭션들={[]} 쓰나 저장하고번호={저장} />;
}

describe('부하 성능 목표', () => {
  it('적은 목표가 있으면 AI 추천은 저장보다 앞에서 묻고, 취소하면 저장도 안 한다', async () => {
    const 저장 = vi.fn().mockResolvedValue(3);
    const 맡김 = vi.spyOn(perfApi, 'suggest').mockResolvedValue({ jobId: 1 } as Awaited<ReturnType<typeof perfApi.suggest>>);
    render(<목표칸 처음={[목표(2000), 목표(3000)]} 저장={저장} />);
    fireEvent.click(screen.getByRole('button', { name: 'AI 추천' }));
    expect(screen.getByText('지금 있는 성능 목표 2개가 AI 추천 목표로 모두 변경됩니다')).toBeTruthy();
    물음누름('취소');
    expect(저장).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'AI 추천' }));
    물음누름('AI 추천');
    await waitFor(() => expect(맡김).toHaveBeenCalledWith(7, 'TARGETS', 3));
    expect(저장).toHaveBeenCalledTimes(1);
  });

  it('적은 목표가 없으면 묻지 않고 바로 맡긴다', async () => {
    const 저장 = vi.fn().mockResolvedValue(null);
    render(<목표칸 처음={[]} 저장={저장} />);
    fireEvent.click(screen.getByRole('button', { name: 'AI 추천' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(저장).toHaveBeenCalledTimes(1));
  });

  it('목표 줄은 두 번 눌러야 지워지고, 값이 같은 다음 줄에 확인 상태가 넘어가지 않는다', () => {
    render(<목표칸 처음={[목표(2000), 목표(2000)]} 저장={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '1번째 목표 삭제' }));
    expect(screen.getByRole('button', { name: '2번째 목표 삭제' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '1번째 목표 삭제 · 삭제 확인' }));
    expect(screen.queryByRole('button', { name: '2번째 목표 삭제' })).toBeNull();
    expect(screen.getByRole('button', { name: '1번째 목표 삭제' }).textContent).toBe('삭제');
  });
});

it('기기 목표 줄은 두 번 눌러야 지워진다', () => {
  const 고침 = vi.fn();
  render(<PerfDeviceTargets 목표들={기본목표} 고침={고침} 쓰나 />);
  const 이름들 = screen.getAllByRole('button', { name: /목표 삭제$/ }).map((b) => b.getAttribute('aria-label')!);
  fireEvent.click(screen.getByRole('button', { name: 이름들[0] }));
  expect(고침).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: `${이름들[0]!} · 삭제 확인` }));
  expect(고침).toHaveBeenCalledWith(기본목표.slice(1));
});

it('트랜잭션 줄은 두 번 눌러야 지워진다', () => {
  const 값: 일단계값 = { name: '주문', 방식: 'TX', 더미번호: null, transactions: [{ name: '상품 목록', method: 'GET', url: '/api/products' }, { name: '주문', method: 'POST', url: '/api/orders' }], notes: {}, 가져온: null };
  const 고침 = vi.fn();
  const 앱 = { id: 7, prefix: 'ZPW', name: 'ZPW 웹', color: '#000', projectId: 3, projectName: '데모마켓', envs: [], hasSlackWebhook: false, permissions: { cases: 'read', runs: 'write', authoring: 'read' } } as ServiceRow;
  render(<PerfStepScenario 값={값} 고침={고침} service={앱} 새것={false} 쓰나 초안받음={vi.fn()} 더미들={[]} 더미오류={null} />);
  fireEvent.click(screen.getByRole('button', { name: '상품 목록 삭제' }));
  expect(고침).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '상품 목록 삭제 · 삭제 확인' }));
  expect(고침).toHaveBeenCalledWith({ ...값, transactions: [값.transactions[1]] });
});
