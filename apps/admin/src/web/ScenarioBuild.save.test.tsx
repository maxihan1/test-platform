// @vitest-environment jsdom
// E2E 시나리오 조립 화면 ① 검사 — 저장 전 확인 · 저장 (도메인/시나리오 §8.11)

import type { ScenarioPart } from '@platform/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from './api.js';
import { useHash, 떠나기막기 } from './leaveGuard.js';
import { scenarioApi } from './scenarioApi.js';
import { ScenarioBuild } from './ScenarioBuild.js';
import { 서비스, 사람, 케이스단계, 상세, 재료, 기존그리기, 이름칸, 바꾸기, 감싸개, 해시가, 케이스목록막기, 케이스더하기 } from './ScenarioBuild.fixture.js';


function 주소따라() {
  const 번호 = /^#\/scenarios\/(\d+)$/.exec(useHash())?.[1];
  return 번호 === undefined ? (
    <ScenarioBuild key="new" id={null} 띠서비스={서비스('ZSB')} user={사람()} />
  ) : (
    <ScenarioBuild key={번호} id={Number(번호)} 띠서비스={서비스('ZSB')} user={사람()} />
  );
}

afterEach(() => {
  떠나기막기(null);
  cleanup();
  vi.restoreAllMocks();
  window.location.hash = '';
});

describe('ScenarioBuild 저장 전 확인', () => {
  it('이름이 공백뿐이면 서버를 안 부르고 사유를 보인다', async () => {
    await 기존그리기();
    const update = vi.spyOn(scenarioApi, 'update');
    바꾸기('   ');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect((await screen.findByRole('status')).textContent).toBe('시나리오 이름을 적어야 저장할 수 있습니다');
    expect(update).not.toHaveBeenCalled();
  });

  it('단계가 0개면 서버를 안 부른다', async () => {
    await 기존그리기({ parts: [] });
    const update = vi.spyOn(scenarioApi, 'update');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect((await screen.findByRole('status')).textContent).toBe('단계를 하나 이상 넣어야 저장할 수 있습니다');
    expect(update).not.toHaveBeenCalled();
  });

  it('값 연결이 가리키는 단계가 비면 서버를 안 부른다', async () => {
    const 이어붙임: ScenarioPart = {
      kind: 'case',
      tcId: 'ZSB-002',
      params: {},
      expected: {},
      skipSteps: [],
      links: [{ kind: 'reuse', method: 'GET', urlPattern: '**/api/x', fromSeq: 0 }],
    };
    await 기존그리기({ parts: [케이스단계('ZSB-001'), 이어붙임] });
    const update = vi.spyOn(scenarioApi, 'update');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect((await screen.findByRole('status')).textContent).toBe('가져올 단계를 다시 골라야 저장할 수 있습니다');
    expect(update).not.toHaveBeenCalled();
  });
});

describe('ScenarioBuild 저장', () => {
  it('새 것은 처음 받은 띠 접두사로 만들고 새 주소로 옮긴다. 상자는 안 뜬다', async () => {
    케이스목록막기('ZSB-001');
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => 재료(tcId));
    const create = vi.spyOn(scenarioApi, 'create').mockResolvedValue({ id: 55, version: 1 });
    await 해시가('#/scenarios/new');
    const { rerender } = render(<감싸개 id={null} 도착="#/scenarios/55" />);
    // 띠를 바꿔도 접두사는 처음 것이다
    rerender(<감싸개 id={null} 띠={서비스('ZSC')} 도착="#/scenarios/55" />);
    await 케이스더하기('ZSB-001');
    바꾸기('  새 흐름  ');
    expect(screen.getByText('저장 안 된 변경 있음')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('도착 화면')).toBeTruthy();
    expect(window.location.hash).toBe('#/scenarios/55');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(create).toHaveBeenCalledWith({
      service: 'ZSB',
      name: '새 흐름',
      platform: 'desktop',
      parts: [케이스단계('ZSB-001')],
    });
  });

  it('새 것을 처음 저장해 화면이 새 번호로 바뀌어도 고르던 단계가 그대로다', async () => {
    케이스목록막기('ZSB-001', 'ZSB-002');
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => 재료(tcId));
    vi.spyOn(scenarioApi, 'create').mockResolvedValue({ id: 55, version: 1 });
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(
      상세({ id: 55, name: '새 흐름', version: 1, parts: [케이스단계('ZSB-001'), 케이스단계('ZSB-002')] }),
    );
    await 해시가('#/scenarios/new');
    render(<주소따라 />);
    await 케이스더하기('ZSB-001');
    await 케이스더하기('ZSB-002');
    바꾸기('새 흐름');
    expect(screen.getByRole('tab', { name: '2번 설정' }).getAttribute('aria-selected')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('SC-55')).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('tab', { name: '2번 설정' }).getAttribute('aria-selected')).toBe('true'));
  });

  it('기존 것은 baseVersion 을 실어 고치고 성공 문장을 보인다', async () => {
    await 기존그리기();
    const update = vi.spyOn(scenarioApi, 'update').mockResolvedValue({ version: 4 });
    바꾸기(' 고친 이름 ');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect((await screen.findByRole('status')).textContent).toBe('저장했습니다 · v4');
    expect(update).toHaveBeenCalledWith(12, {
      name: '고친 이름',
      platform: 'desktop',
      parts: 상세().parts,
      baseVersion: 3,
    });
    expect(screen.queryByText('저장 안 된 변경 있음')).toBeNull();
  });

  it('저장했습니다 줄은 저장 뒤에 다시 고치면 사라진다', async () => {
    await 기존그리기();
    vi.spyOn(scenarioApi, 'update').mockResolvedValue({ version: 4 });
    바꾸기('고친 이름');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect((await screen.findByRole('status')).textContent).toBe('저장했습니다 · v4');

    바꾸기('또 고친 이름');

    expect(screen.queryByText('저장했습니다 · v4')).toBeNull();
    expect(screen.getByText('저장 안 된 변경 있음')).toBeTruthy();
  });

  it('저장 응답을 기다리는 사이 이름을 바꾸면 바꾼 글자가 남는다', async () => {
    await 기존그리기();
    let 끝내기: (값: { version: number }) => void = () => {};
    vi.spyOn(scenarioApi, 'update').mockReturnValue(new Promise((끝) => (끝내기 = 끝)));
    바꾸기(' 고친 이름 ');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    바꾸기('저장 중에 친 글자');
    await act(async () => {
      끝내기({ version: 4 });
    });

    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeTruthy());
    expect(이름칸().value).toBe('저장 중에 친 글자');
    expect(screen.getByText('저장 안 된 변경 있음')).toBeTruthy();
  });

  it('STALE_VERSION 은 다른 사람이 먼저 저장했다는 문장이 뜬다', async () => {
    await 기존그리기();
    vi.spyOn(scenarioApi, 'update').mockRejectedValue(new ApiError(409, 'STALE_VERSION', 'stale'));
    바꾸기('고침');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect((await screen.findByRole('status')).textContent).toContain('다른 사람이 먼저 저장했습니다');
  });

  it('400 INVALID_REQUEST 는 서버가 짚은 사유를 보인다', async () => {
    await 기존그리기();
    vi.spyOn(scenarioApi, 'update').mockRejectedValue(new ApiError(400, 'INVALID_REQUEST', '3번 단계: 주소 형식'));
    바꾸기('고침');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect((await screen.findByRole('status')).textContent).toContain('3번 단계: 주소 형식');
  });
});
