// @vitest-environment jsdom
// E2E 시나리오 조립 화면 ① 검사 — 새 시나리오 · 기존 시나리오 불러오기 (도메인/시나리오 §8.11)

import type { ScenarioPart } from '@platform/kit';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from './api.js';
import { 떠나기막기 } from './leaveGuard.js';
import { scenarioApi } from './scenarioApi.js';
import { ScenarioBuild } from './ScenarioBuild.js';
import { when } from './ui.js';
import { 서비스, 사람, 상세, 재료, 기존그리기, 새로그리기, 이름칸, 바꾸기 } from './ScenarioBuild.fixture.js';

// 새 시나리오는 단계를 넣는 길이 다음 할 일에서 생긴다. 그때까지 저장 흐름은 처음 한 번 단계를 심어 본다
const 심기 = vi.hoisted(() => ({ 단계들: null as ScenarioPart[] | null, 재료: [] as string[] }));
vi.mock('./useScenarioDraft.js', async (원래) => {
  const 본 = await 원래<typeof import('./useScenarioDraft.js')>();
  const { useEffect } = await import('react');
  return {
    ...본,
    useScenarioDraft: (...인자: Parameters<typeof 본.useScenarioDraft>) => {
      const 초안 = 본.useScenarioDraft(...인자);
      useEffect(() => {
        if (심기.단계들 !== null) 초안.단계들바꾸기(심기.단계들);
        심기.재료.forEach((n) => 초안.재료더하기(n));
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return 초안;
    },
  };
});

afterEach(() => {
  심기.단계들 = null;
  심기.재료 = [];
  떠나기막기(null);
  cleanup();
  vi.restoreAllMocks();
  window.location.hash = '';
});

describe('ScenarioBuild 새 시나리오', () => {
  it('이름은 비고 디바이스는 PC 이고 처음 탭은 add 이며 변경 이력 버튼이 없다', async () => {
    const { container } = 새로그리기();

    expect(이름칸().value).toBe('');
    expect(이름칸().placeholder).toBe('시나리오 이름');
    expect((screen.getByLabelText('디바이스') as HTMLSelectElement).value).toBe('desktop');
    expect(container.querySelector('.scn-build')?.getAttribute('data-tab')).toBe('add');
    expect(screen.queryByRole('button', { name: '변경 이력' })).toBeNull();
    expect(screen.queryByText('저장 안 된 변경 있음')).toBeNull();
    expect(screen.getByRole('link', { name: '← 목록' }).getAttribute('href')).toBe('#/scenarios');
  });

  it('쓰기 권한이 없으면 목록으로 보낸다', async () => {
    window.location.hash = '#/scenarios/new';
    새로그리기(사람('read'));
    await waitFor(() => expect(window.location.hash).toBe('#/scenarios'));
  });
});

describe('ScenarioBuild 기존 시나리오 불러오기', () => {
  it('case 단계의 겹치지 않는 tcId 마다 따로 한 번씩 재료를 부른다', async () => {
    const { caseParts } = await 기존그리기();
    await waitFor(() => expect(caseParts).toHaveBeenCalledTimes(2));
    expect(caseParts.mock.calls.map((c) => c[0]).sort()).toEqual(['ZSB-001', 'ZSB-002']);
  });

  it('StrictMode 로 불러오기가 두 번 돌아도 1번 설정 패널이 재료를 받아 케이스 이름을 그린다', async () => {
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세());
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => 재료(tcId));
    render(
      <StrictMode>
        <ScenarioBuild id={12} 띠서비스={서비스('ZSB')} user={사람()} />
      </StrictMode>,
    );
    expect(await screen.findByRole('heading', { name: 'ZSB-001 ZSB-001 케이스' })).toBeTruthy();
  });

  it('재료 하나가 404 여도 화면이 뜬다', async () => {
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세());
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => {
      if (tcId === 'ZSB-002') throw new ApiError(404, 'CASE_NOT_FOUND', 'gone');
      return 재료(tcId);
    });
    render(<ScenarioBuild id={12} 띠서비스={서비스('ZSB')} user={사람()} />);

    expect((await screen.findByLabelText('시나리오 이름') as HTMLInputElement).value).toBe('ZSB 가입 흐름');
  });

  it('재료 하나가 404 가 아닌 오류(500)면 이름 칸 대신 오류 문장이 뜬다', async () => {
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세());
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => {
      if (tcId === 'ZSB-002') throw new ApiError(500, 'INTERNAL', '서버가 아픕니다');
      return 재료(tcId);
    });
    render(<ScenarioBuild id={12} 띠서비스={서비스('ZSB')} user={사람()} />);

    expect(await screen.findByText('서버가 아픕니다')).toBeTruthy();
    expect(screen.queryByLabelText('시나리오 이름')).toBeNull();
  });

  it('StrictMode 로 그려도 재료 하나가 500 이면 이름 칸 대신 오류 문장이 뜬다', async () => {
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세());
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => {
      if (tcId === 'ZSB-002') throw new ApiError(500, 'INTERNAL', '서버가 아픕니다');
      return 재료(tcId);
    });
    render(
      <StrictMode>
        <ScenarioBuild id={12} 띠서비스={서비스('ZSB')} user={사람()} />
      </StrictMode>,
    );

    expect(await screen.findByText('서버가 아픕니다')).toBeTruthy();
    expect(screen.queryByLabelText('시나리오 이름')).toBeNull();
  });

  it('재료더하기가 404 면 오류 줄 없이 재료 없음으로 둔다', async () => {
    심기.재료 = ['ZSB-404'];
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세());
    const caseParts = vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => {
      if (tcId === 'ZSB-404') throw new ApiError(404, 'CASE_NOT_FOUND', 'gone');
      return 재료(tcId);
    });
    render(<ScenarioBuild id={12} 띠서비스={서비스('ZSB')} user={사람()} />);
    await screen.findByLabelText('시나리오 이름');
    await waitFor(() => expect(caseParts).toHaveBeenCalledWith('ZSB-404'));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('재료더하기가 500 이면 오류 문장을 상태 줄에 싣는다', async () => {
    심기.재료 = ['ZSB-500'];
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세());
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => {
      if (tcId === 'ZSB-500') throw new ApiError(500, 'INTERNAL', '재료를 못 읽었습니다');
      return 재료(tcId);
    });
    render(<ScenarioBuild id={12} 띠서비스={서비스('ZSB')} user={사람()} />);

    expect((await screen.findByRole('status')).textContent).toBe('재료를 못 읽었습니다');
  });

  it('SC 번호 · 버전 줄 · 처음 탭 settings · 변경 이력 버튼이 나온다', async () => {
    const { container } = await 기존그리기();

    expect(screen.getByText('SC-12')).toBeTruthy();
    expect(screen.getByText(`v3 · 홍길동 저장 · ${when('2026-10-06T00:10:00.000Z', 'ko')}`)).toBeTruthy();
    expect(container.querySelector('.scn-build')?.getAttribute('data-tab')).toBe('settings');
    fireEvent.click(screen.getByRole('button', { name: '변경 이력' }));
    expect(container.querySelector('.scn-build')?.getAttribute('data-tab')).toBe('history');
  });

  it('단계가 있게 불러온 시나리오는 1번 설정 탭이 열리고 새 시나리오는 단계 추가 탭이 열린다', async () => {
    const { unmount } = await 기존그리기();
    expect((await screen.findByRole('tab', { name: '1번 설정' })).getAttribute('aria-selected')).toBe('true');
    unmount();

    새로그리기();
    expect(screen.queryByRole('tab', { name: /번 설정/ })).toBeNull();
    expect(screen.getByRole('tab', { name: '단계 추가' }).getAttribute('aria-selected')).toBe('true');
  });

  it('이름을 고치면 저장 안 된 변경 있음 칩이 뜬다', async () => {
    await 기존그리기();
    expect(screen.queryByText('저장 안 된 변경 있음')).toBeNull();
    바꾸기('새 이름');
    expect(screen.getByText('저장 안 된 변경 있음').className).toContain('case-tag');
  });
});
