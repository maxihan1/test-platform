// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServiceGuide } from '@platform/kit';

import { AuthoringNew } from './AuthoringNew.js';

const { 지금, 저장 } = vi.hoisted(() => ({
  지금: vi.fn<(service: string) => Promise<ServiceGuide>>(),
  저장: vi.fn((_s: string, _base: number, _글: unknown) => Promise.resolve({ version: 1 })),
}));

vi.mock('./guideApi.js', () => ({ guideApi: { now: 지금, save: 저장 } }));

const 빈가이드: ServiceGuide = { version: 0, intro: '', policy: '', rules: '', files: [], savedAt: null, savedByName: null };
const 있는가이드: ServiceGuide = { ...빈가이드, version: 2, intro: '중고 거래 웹', rules: '주문 이름은 qa- 로 시작합니다' };

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

const 버튼 = (이름: string) => screen.getByRole('button', { name: 이름 }) as HTMLButtonElement;
const 지금단계 = () => within(screen.getByRole('list', { name: '단계' })).getByRole('listitem', { current: 'step' }).textContent;

describe('새 작성 마법사 1단계 — 가이드 먼저 (2026-11-11 사용자)', () => {
  it('가이드가 비었으면 칸 셋이 열려 있고, 「나중에 쓰기」는 저장하지 않고 다음 단계로 간다', async () => {
    지금.mockResolvedValue(빈가이드);
    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    expect(await screen.findByRole('textbox', { name: '애플리케이션 소개' })).toBeTruthy();
    expect(screen.getAllByRole('textbox')).toHaveLength(3);
    expect(screen.getByText('애플리케이션을 알려 주세요')).toBeTruthy();
    expect(버튼('저장하고 다음').disabled).toBe(true);
    fireEvent.click(버튼('나중에 쓰기'));
    expect(지금단계()).toBe('2 작성 방법');
    expect(저장).not.toHaveBeenCalled();
  });

  it('비어 있던 가이드에 적고 「저장하고 다음」을 누르면 세 구획을 버전 0 위에 저장하고 넘어간다', async () => {
    지금.mockResolvedValueOnce(빈가이드).mockResolvedValue({ ...빈가이드, version: 1, policy: '실카드는 쓰지 않습니다' });
    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    fireEvent.change(await screen.findByRole('textbox', { name: '정책' }), { target: { value: '실카드는 쓰지 않습니다' } });
    fireEvent.click(버튼('저장하고 다음'));
    await waitFor(() => expect(지금단계()).toBe('2 작성 방법'));
    expect(저장).toHaveBeenCalledWith('PAY', 0, { intro: '', policy: '실카드는 쓰지 않습니다', rules: '' });
  });

  it('가이드가 있으면 읽기로 보이고 바로 다음으로 간다 — 확인 단계가 그 버전을 같이 읽는다고 적는다', async () => {
    지금.mockResolvedValue(있는가이드);
    render(<AuthoringNew service="PAY" envs={[{ env: 'qa', baseUrl: 'https://qa.example.com' }]} on넣었다={() => {}} />);
    expect(await screen.findByText('주문 이름은 qa- 로 시작합니다')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: '나중에 쓰기' })).toBeNull();
    fireEvent.click(버튼('다음'));
    fireEvent.click(버튼('화면을 훑어서 작성'));
    fireEvent.click(버튼('다음'));
    fireEvent.click(버튼('다음'));
    expect(지금단계()).toBe('4 확인');
    expect(screen.getByText('웹 가이드 버전 2 을 같이 읽습니다')).toBeTruthy();
  });

  it('있는 가이드의 구획을 고치는 중이면 저장하거나 취소할 때까지 다음으로 못 간다', async () => {
    지금.mockResolvedValue(있는가이드);
    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: '작업 규칙 수정' }));
    fireEvent.change(screen.getByRole('textbox', { name: '작업 규칙' }), { target: { value: '고치는 중' } });
    expect(버튼('다음').disabled).toBe(true);
    expect(screen.getByText('수정한 가이드 구획을 저장하거나 취소하세요')).toBeTruthy();
    fireEvent.click(within(screen.getByRole('region', { name: '작업 규칙' })).getByRole('button', { name: '취소' }));
    expect(버튼('다음').disabled).toBe(false);
  });
});
