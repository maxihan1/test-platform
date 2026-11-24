// @vitest-environment jsdom
// 실패 카드 찾기 검사 — 쪽을 넘기지 않고 그 케이스 것만 한 번에 받는다 (도메인/리포팅 §7 `GET /api/runs/:runId/failures`)

import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './api.js';
import { 카드찾기 } from './failureFind.js';
import { 장치, 쪽, 케이스 } from './RunFailCard.fixture.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('카드찾기', () => {
  it('그 케이스 번호로 통로를 한 번만 부르고 찾은 카드를 돌려준다', async () => {
    const 부름 = vi.spyOn(api, 'failures').mockResolvedValue(쪽([케이스('ZZI-0002', '로그인', [장치('desktop', 2)])]));

    const 카드 = await 카드찾기(5011, 'ZZI-0002', 'mobile');

    expect(카드?.tcName).toBe('로그인');
    expect(부름).toHaveBeenCalledTimes(1);
    expect(부름).toHaveBeenCalledWith(5011, 1, 'mobile', false, 'ZZI-0002');
  });

  it('디바이스를 안 주면 전체로 묻는다', async () => {
    const 부름 = vi.spyOn(api, 'failures').mockResolvedValue(쪽([케이스('ZZI-0002', '로그인', [장치('desktop', 2)])]));

    await 카드찾기(5011, 'ZZI-0002');

    expect(부름).toHaveBeenCalledWith(5011, 1, undefined, false, 'ZZI-0002');
  });

  it('카드가 없거나 다른 케이스뿐이면 null 이다 — 다음 쪽을 더 찾지 않는다', async () => {
    const 부름 = vi.spyOn(api, 'failures').mockResolvedValue(쪽([케이스('ZZI-0009', '탈퇴', [장치('desktop', 9)])], { total: 40 }));

    expect(await 카드찾기(5011, 'ZZI-0002')).toBeNull();
    expect(부름).toHaveBeenCalledTimes(1);
  });
});
