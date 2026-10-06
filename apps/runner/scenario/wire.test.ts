// 고정 spec 이 옮겨 적은 글자가 kit 과 같은지 지킨다. 어긋나면 결과 줄이 안 읽히거나 케이스를 못 꺼낸다

import {
  SCENARIO_CLEANUP_MARKER as kit뒷정리표시자, SCENARIO_PART_MARKER as kit표시자, SCENARIO_REGISTRY_KEY as kit열쇠, registerScenarioCase,
} from '@platform/kit/scenario';
import { describe, expect, it } from 'vitest';

import { SCENARIO_CLEANUP_MARKER, SCENARIO_PART_MARKER, SCENARIO_REGISTRY_KEY, 꺼냄, 뒷정리줄, 부품줄 } from './wire.js';

describe('고정 spec 과 kit 의 약속', () => {
  it('표시자와 열쇠가 kit 과 같다', () => {
    expect(SCENARIO_PART_MARKER).toBe(kit표시자);
    expect(SCENARIO_REGISTRY_KEY).toBe(kit열쇠);
    expect(SCENARIO_CLEANUP_MARKER).toBe(kit뒷정리표시자);
  });

  it('kit 이 올린 실행 함수를 kit 없이 꺼낸다', () => {
    const 실행 = async () => ({ seq: 0, steps: [], failed: false });
    registerScenarioCase('XWR-001', 실행);

    expect(꺼냄('XWR-001')).toBe(실행);
  });

  it('부품 결과 줄은 표시자 + JSON 한 줄이다', () => {
    const 줄 = 부품줄({ seq: 1, status: 'PASS', durationMs: 1, steps: [], mocks: [] });

    expect(줄).toBe(`${kit표시자}{"seq":1,"status":"PASS","durationMs":1,"steps":[],"mocks":[]}\n`);
  });

  it('뒷정리 줄은 표시자 + JSON 한 줄이다', () => {
    const 줄 = 뒷정리줄([{ fromSeq: 1, method: 'DELETE', url: 'https://x/api/a', status: 200 }]);

    expect(줄).toBe(`${kit뒷정리표시자}[{"fromSeq":1,"method":"DELETE","url":"https://x/api/a","status":200}]\n`);
  });
});
