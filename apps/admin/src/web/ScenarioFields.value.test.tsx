// @vitest-environment jsdom
// E2E 시나리오 입력값 칸 검사 — 비워 둔 칸에 실제로 쓰일 값(저장값 · 코드 기본값)이 흐리게 보이고 비밀은 가려진다 (도메인/시나리오 §8.11)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';

import { api, type CaseRow, type SavedInput } from './api.js';
import { 단계, 재료, 그리기 } from './ScenarioPartPanel.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 스키마 = {
  type: 'object',
  properties: {
    name: { type: 'string', description: '이름', default: '기본이름' },
    qty: { type: 'number', description: '수량' },
    agree: { type: 'boolean', description: '동의', default: true },
    kind: { type: 'string', description: '종류', enum: ['A', 'B'], default: 'B' },
    pw: { type: 'string', description: '비밀번호 입력' },
    memo: { type: 'string', description: '메모' },
  },
  required: ['qty'],
};

const 저장 = (덮: Partial<SavedInput> = {}): SavedInput => ({
  params: {},
  expected: {},
  savedSecrets: { params: [], expected: [] },
  savedBy: 'zsb',
  savedAt: '2026-10-19T00:00:00.000Z',
  ...덮,
});

function 케이스(savedInput: SavedInput | null): CaseRow {
  return { tcId: 'ZSB-001', savedInput } as CaseRow;
}

const 글칸 = (이름: string) => screen.getByLabelText(이름) as HTMLInputElement;
const 고르개 = (이름: string) => screen.getByLabelText(이름) as unknown as HTMLSelectElement;

describe('ScenarioFields 비워 둔 칸의 실제 값', () => {
  it('저장값이 있으면 저장값 사용 · 값을 보인다', async () => {
    vi.spyOn(api, 'caseOf').mockResolvedValue(케이스(저장({ params: { name: '저장이름', qty: 3 } })));
    그리기(단계('ZSB-001'), 재료('ZSB-001', { paramSchema: 스키마 }));
    await waitFor(() => expect(글칸('이름').placeholder).toBe('저장값 사용 · 저장이름'));
    expect(글칸('수량').placeholder).toBe('저장값 사용 · 3');
  });

  it('저장값이 없고 코드 기본값만 있으면 기본값 사용 · 값을 보이고, 둘 다 없으면 저장값 사용이다', async () => {
    vi.spyOn(api, 'caseOf').mockResolvedValue(케이스(저장()));
    그리기(단계('ZSB-001'), 재료('ZSB-001', { paramSchema: 스키마 }));
    await waitFor(() => expect(글칸('이름').placeholder).toBe('기본값 사용 · 기본이름'));
    expect(글칸('메모').placeholder).toBe('저장값 사용');
  });

  it('참거짓과 고르는 칸의 빈 선택지도 같은 글로 보인다', async () => {
    vi.spyOn(api, 'caseOf').mockResolvedValue(케이스(저장({ params: { agree: false } })));
    그리기(단계('ZSB-001'), 재료('ZSB-001', { paramSchema: 스키마 }));
    await waitFor(() => expect(고르개('동의').options[0]?.textContent).toBe('저장값 사용 · 아니오'));
    expect(고르개('종류').options[0]?.textContent).toBe('기본값 사용 · B');
  });

  it('저장된 비밀 칸은 값을 가리고 저장된 비밀이 없으면 저장값 사용이다', async () => {
    vi.spyOn(api, 'caseOf').mockResolvedValue(
      케이스(저장({ params: { name: '저장이름' }, savedSecrets: { params: ['pw'], expected: [] } })),
    );
    그리기(단계('ZSB-001'), 재료('ZSB-001', { paramSchema: 스키마 }));
    await waitFor(() => expect(글칸('비밀번호 입력').placeholder).toBe('저장값 사용 · ********'));
  });

  it('케이스를 못 받으면(404 · 오류) 지금 글 그대로다', async () => {
    const 호출 = vi.spyOn(api, 'caseOf').mockRejectedValue(new Error('not found'));
    그리기(단계('ZSB-001'), 재료('ZSB-001', { paramSchema: 스키마 }));
    await waitFor(() => expect(호출).toHaveBeenCalledTimes(1));
    expect(글칸('이름').placeholder).toBe('저장값 사용');
  });

  it('입력값과 기대값 칸이 함께 있어도 같은 케이스는 한 번만 부른다', async () => {
    const 호출 = vi.spyOn(api, 'caseOf').mockResolvedValue(케이스(저장({ params: { name: 'x' } })));
    그리기(단계('ZSB-001'), 재료('ZSB-001', { paramSchema: 스키마, expectedSchema: 스키마 }));
    await waitFor(() => expect(screen.getAllByLabelText('이름')[0]).toHaveProperty('placeholder', '저장값 사용 · x'));
    expect(호출).toHaveBeenCalledTimes(1);
  });
});
