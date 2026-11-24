// @vitest-environment jsdom
// 조립 화면이 프로시저 단계의 저장본을 열 때 — 프로시저 칸을 단계에서 떼 따로 들고, 저장 때 되돌려 보내지 않고, 건너뛸 제목을 뺀다 (도메인/시나리오 §3.7 결정 17)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { scenarioApi } from './scenarioApi.js';
import { useScenarioDraft } from './useScenarioDraft.js';
import { 재료, 상세 } from './ScenarioBuild.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useScenarioDraft · 새로 고른 케이스', () => {
  it('재료가 프로시저를 알려 주면 프로시저를 따로 든다', async () => {
    vi.spyOn(scenarioApi, 'caseParts').mockResolvedValue({ ...재료('ZSB-FN-002'), procId: 'ZSB-TP-001', procName: '글쓰기 흐름', cases: [{ tcId: 'ZSB-FN-002', name: '글쓰기' }] });
    const { result } = renderHook(() => useScenarioDraft(null, 'ZSB'));
    act(() => result.current.재료더하기('ZSB-FN-002'));
    await waitFor(() => expect(result.current.프로시저들.get('ZSB-FN-002')).toEqual({ procId: 'ZSB-TP-001', procName: '글쓰기 흐름', cases: [{ tcId: 'ZSB-FN-002', name: '글쓰기' }] }));
  });
});

describe('useScenarioDraft · 프로시저 단계', () => {
  it('열 때 프로시저 단계의 건너뛸 제목을 빼고 프로시저는 따로 들며 저장 본문에는 프로시저 칸이 없다', async () => {
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(
      상세({
        parts: [
          {
            kind: 'case',
            tcId: 'ZSB-FN-002',
            params: {},
            expected: {},
            skipSteps: ['로그인한다'],
            procId: 'ZSB-TP-001',
            procName: '글쓰기 흐름',
            cases: [{ tcId: 'ZSB-FN-001', name: '로그인' }, { tcId: 'ZSB-FN-002', name: '글쓰기' }],
          },
        ],
      }),
    );
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => 재료(tcId));
    const 고침 = vi.spyOn(scenarioApi, 'update').mockResolvedValue({ version: 4 });

    const { result } = renderHook(() => useScenarioDraft(12, null));
    await waitFor(() => expect(result.current.불러옴).toBe(true));

    expect(result.current.단계들).toEqual([{ kind: 'case', tcId: 'ZSB-FN-002', params: {}, expected: {}, skipSteps: [] }]);
    expect(result.current.프로시저들.get('ZSB-FN-002')).toEqual({
      procId: 'ZSB-TP-001',
      procName: '글쓰기 흐름',
      cases: [{ tcId: 'ZSB-FN-001', name: '로그인' }, { tcId: 'ZSB-FN-002', name: '글쓰기' }],
    });
    expect(result.current.바뀜).toBe(true);

    await act(async () => {
      await result.current.저장();
    });
    const 보낸 = 고침.mock.calls[0]![1].parts[0]!;
    expect(Object.keys(보낸)).not.toContain('procId');
    expect(Object.keys(보낸)).not.toContain('cases');
    expect((보낸 as { skipSteps: string[] }).skipSteps).toEqual([]);
  });
});
