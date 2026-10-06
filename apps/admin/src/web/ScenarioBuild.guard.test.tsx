// @vitest-environment jsdom
// E2E 시나리오 조립 화면 ① 검사 — 권한 · 치운 것 · 서비스 고정 · 떠나기 확인 (도메인/시나리오 §8.11)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { 떠나기막기 } from './leaveGuard.js';
import { scenarioApi } from './scenarioApi.js';
import { 서비스, 사람, 상세, 재료, 기존그리기, 이름칸, 바꾸기, 감싸개, 해시가 } from './ScenarioBuild.fixture.js';

afterEach(() => {
  떠나기막기(null);
  cleanup();
  vi.restoreAllMocks();
  window.location.hash = '';
});

describe('ScenarioBuild 권한 · 치운 것 · 서비스', () => {
  it('쓰기 권한이 없으면 저장 · 변경 이력이 없고 안내가 뜨고 이름은 읽기 전용이다', async () => {
    await 기존그리기({}, 사람('read'));

    expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
    expect(screen.queryByRole('button', { name: '변경 이력' })).toBeNull();
    expect(screen.getByText('실행 권한이 있어야 고치고 돌릴 수 있습니다')).toBeTruthy();
    expect(이름칸().readOnly).toBe(true);
    expect((screen.getByLabelText('디바이스') as HTMLSelectElement).disabled).toBe(true);
  });

  it('치운 시나리오는 쓰기 버튼이 없고 안내가 뜨며 고쳐도 떠나기를 안 막는다', async () => {
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세({ isActive: false }));
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => 재료(tcId));
    await 해시가('#/scenarios/12');
    render(<감싸개 id={12} 도착="#/runs" />);
    await screen.findByLabelText('시나리오 이름');

    expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
    expect(screen.getByText('목록에서 치운 시나리오라 보기만 할 수 있습니다')).toBeTruthy();
    fireEvent.change(이름칸(), { target: { value: '고침' } });
    expect(screen.queryByText('저장 안 된 변경 있음')).toBeNull();
    await 해시가('#/runs');
    expect(await screen.findByText('도착 화면')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('띠 서비스가 시나리오의 서비스와 다르면 안내 줄이 뜬다', async () => {
    await 기존그리기({}, 사람(), 서비스('ZSC'));
    expect(screen.getByText('ZSB 서비스 서비스의 시나리오입니다')).toBeTruthy();
  });
});

describe('ScenarioBuild 떠나기 확인', () => {
  it('바뀐 채 떠나려 하면 상자가 뜨고 머무르기가 먼저 포커스를 받는다', async () => {
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세());
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => 재료(tcId));
    await 해시가('#/scenarios/12');
    render(<감싸개 id={12} 도착="#/runs" />);
    await screen.findByLabelText('시나리오 이름');
    바꾸기('고침');

    await 해시가('#/runs');
    const 상자 = await screen.findByRole('dialog', { name: '저장 안 된 변경 있음' });
    expect(상자.textContent).toContain('이 화면을 떠나면 저장하지 않은 내용이 사라집니다');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '머무르기' }));
    expect(window.location.hash).toBe('#/scenarios/12');

    fireEvent.click(screen.getByRole('button', { name: '머무르기' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    await 해시가('#/runs');
    await screen.findByRole('dialog');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '저장하지 않고 떠나기' }));
    });
    expect(await screen.findByText('도착 화면')).toBeTruthy();
    expect(window.location.hash).toBe('#/runs');
  });
});
