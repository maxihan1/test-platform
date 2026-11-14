import { describe, expect, it } from 'vitest';

import { 담을실행, 묶음열쇠 } from './qaReport.js';

describe('QA 리포트 묶음', () => {
  it('묶음 열쇠는 대상 서버 · 빌드 번호를 감싸 ":" 가 섞여도 두 묶음이 한 열쇠가 되지 않는다', () => {
    expect(묶음열쇠({ serviceId: 3, env: 'qa', buildNo: '1.0:1' })).toBe('B:3:qa:1.0%3A1');
    expect(묶음열쇠({ serviceId: 3, env: 'qa:1', buildNo: '0' })).not.toBe(묶음열쇠({ serviceId: 3, env: 'qa', buildNo: '1:0' }));
    expect(묶음열쇠({ serviceId: 3, env: 'qa', buildNo: null, runId: 7 })).toBe('R:7');
    expect(묶음열쇠({ serviceId: 3, env: 'qa', buildNo: null, perfRunId: 8 })).toBe('P:8');
  });

  it('승인 뒤 이 버전을 세우기 전에 끝난 정기 실행은 담지 않고 도는 실행도 담지 않는다', () => {
    const 세운때 = new Date('2026-11-14T00:00:00Z');
    const 줄 = (id: string, scheduled: boolean, at: string | null) => ({ id, scheduled, finished: at !== null, finished_at: at === null ? null : new Date(at) });
    const 줄들 = [줄('1', true, '2026-11-12T00:00:00Z'), 줄('2', true, '2026-11-13T00:00:00Z'), 줄('3', false, '2026-11-13T00:00:00Z'), 줄('4', true, '2026-11-14T01:00:00Z'), 줄('5', false, null)];
    expect(담을실행(줄들, ['1'], 세운때)).toEqual([1, 3, 4]);
    // 첫 버전은 다 담는다
    expect(담을실행(줄들, [], null)).toEqual([1, 2, 3, 4]);
  });
});
