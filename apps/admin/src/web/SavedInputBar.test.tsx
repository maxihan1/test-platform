// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, ApiError, type JsonSchema, type SavedInput } from './api.js';
import { 채운글자, type 줄글자 } from './caseValues.js';
import { 값저장, 고쳤나 } from './SavedInputBar.js';
import { schemaToFields, toValues } from './schema.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 입력: JsonSchema = {
  type: 'object',
  properties: {
    userId: { type: 'string', description: '아이디', default: 'guest' },
    password: { type: 'string', description: '비밀번호' },
  },
} as unknown as JsonSchema;

const 저장값: SavedInput = {
  params: { userId: 'user1' },
  expected: {},
  savedSecrets: { params: ['password'], expected: [] },
  savedBy: '맥시',
  savedAt: '2026-09-29T05:02:00.000Z',
};

// 상세 칸(CaseDetail)이 값저장 에 넘기는 그대로 만든다
function 줄(글자?: 줄글자, 저장된다 = true, savedInput: SavedInput | null = 저장값, on저장됨 = vi.fn()) {
  const 칸 = schemaToFields(입력, savedInput?.params, savedInput?.savedSecrets.params);
  render(
    <값저장
      tcId="ZSV-001"
      값={{ params: toValues(칸, 채운글자(칸, 글자?.params)), expected: {} }}
      고침={고쳤나(칸, 글자?.params)}
      saved={savedInput}
      된다={저장된다}
      on저장됨={on저장됨}
    />,
  );
  return on저장됨;
}

describe('케이스 상세 칸의 저장 (도메인/실행 §8.2 · ⑫ 점검 7.6)', () => {
  it('고친 칸이 없으면 저장 버튼 대신 누가 저장했는지가 보인다', () => {
    줄();
    expect(screen.queryByRole('button', { name: '모두에게 저장' })).toBeNull();
    expect(screen.getByText(/저장값 · 맥시 ·/)).toBeTruthy();
  });

  it('저장값과 같은 글자로 되돌렸으면 고친 것이 아니다', () => {
    줄({ params: { userId: 'user1' }, expected: {} });
    expect(screen.queryByRole('button', { name: '모두에게 저장' })).toBeNull();
  });

  it('고친 칸이 있으면 저장을 누를 수 있고 채운 값 전체가 간다. 비워 둔 저장 비밀값은 안 보낸다', async () => {
    const 저장 = vi.spyOn(api, 'saveInput').mockResolvedValue(null);
    const on저장됨 = 줄({ params: { userId: 'user2' }, expected: {} });

    fireEvent.click(screen.getByRole('button', { name: '모두에게 저장' }));

    await waitFor(() => expect(on저장됨).toHaveBeenCalledTimes(1));
    expect(저장).toHaveBeenCalledWith('ZSV-001', { params: { userId: 'user2' }, expected: {} });
  });

  it('누르기 전에 팀 모두와 정기 실행이 이 값을 쓴다고 적는다', () => {
    const 저장 = vi.spyOn(api, 'saveInput').mockResolvedValue(null);
    줄({ params: { userId: 'user2' }, expected: {} });

    expect(screen.getByText('팀 모두와 정기 실행이 이 값을 씁니다')).toBeTruthy();
    expect(저장).not.toHaveBeenCalled();
  });

  it('서버가 거절하면 줄 아래에 첫 사유를 한 줄로 적는다', async () => {
    vi.spyOn(api, 'saveInput').mockRejectedValue(
      new ApiError(400, 'INVALID_PARAMS', '아이디가 틀렸다', [{ path: 'userId', message: '아이디가 틀렸다' }]),
    );
    const on저장됨 = 줄({ params: { userId: 'user2' }, expected: {} });

    fireEvent.click(screen.getByRole('button', { name: '모두에게 저장' }));

    expect(await screen.findByText('아이디가 틀렸다')).toBeTruthy();
    expect(on저장됨).not.toHaveBeenCalled();
  });

  it('케이스 쓰기가 아니면 고쳐도 저장 버튼이 없다', () => {
    줄({ params: { userId: 'user2' }, expected: {} }, false);
    expect(screen.queryByRole('button', { name: '모두에게 저장' })).toBeNull();
  });
});
