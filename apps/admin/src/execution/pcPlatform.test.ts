// 실행을 만들 때 윈도우 PC 값을 빼는 막음을 검사한다

import { describe, expect, it } from 'vitest';

import { PC항목을뺀다 } from './pcPlatform.js';

describe('PC항목을뺀다', () => {
  it('폰과 같이 선언한 게임 케이스는 android 만 남기고, windows 뿐인 케이스는 통째로 뺀다', () => {
    expect(
      PC항목을뺀다([
        { tcId: 'ARG-FN-001', platforms: ['android', 'windows'] },
        { tcId: 'ARG-FN-002', platforms: ['windows-ps5'] },
        { tcId: 'WEB-001', platforms: ['desktop', 'mobile'] },
      ]),
    ).toEqual([
      { tcId: 'ARG-FN-001', platforms: ['android'] },
      { tcId: 'WEB-001', platforms: ['desktop', 'mobile'] },
    ]);
  });
});
