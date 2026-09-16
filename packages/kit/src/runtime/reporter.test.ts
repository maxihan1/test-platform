// 리포터는 상대 import를 둘 수 없어 표시자를 따로 들고 있다. 두 벌이 어긋나면 러너가 결과 줄을 영영 못 찾는다

import { describe, expect, it } from 'vitest';

import { RESULT_MARKER, STEP_ATTACHMENT } from './protocol.js';
import { RESULT_MARKER as REPORTER_MARKER, STEP_ATTACHMENT as REPORTER_ATTACHMENT } from './reporter.js';

describe('리포터가 들고 있는 표시자', () => {
  it('protocol.ts의 값과 같다', () => {
    expect(REPORTER_MARKER).toBe(RESULT_MARKER);
    expect(REPORTER_ATTACHMENT).toBe(STEP_ATTACHMENT);
  });
});
