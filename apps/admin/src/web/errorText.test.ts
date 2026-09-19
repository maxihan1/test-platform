import { describe, expect, it } from 'vitest';

import { 요청오류문장 } from './errorText.js';

describe('서버가 준 오류 코드를 사람 말로', () => {
  // 실행 결과 주소는 사람이 메신저에 붙여 나누는 링크다. 배정 안 받은 사람이
  // 그것을 누르면 접두사 글자 하나가 아니라 무슨 일인지와 빠져나갈 길을 봐야 한다
  it('배정 안 받은 서비스는 무슨 일인지와 빠져나갈 길을 적는다', () => {
    const 글 = 요청오류문장('SERVICE_FORBIDDEN', 'XFS3B');
    expect(글).toContain('배정');
    expect(글).toContain('운영 등급');
    expect(글).not.toBe('XFS3B');
  });

  it('등급이 모자라면 무엇이 모자란지 적는다', () => {
    expect(요청오류문장('FORBIDDEN', 'operator')).toContain('등급');
  });

  it('없는 것을 부르면 지워졌거나 주소가 틀렸다고 적는다', () => {
    expect(요청오류문장('RUN_NOT_FOUND', '5867')).toContain('찾지 못했습니다');
    expect(요청오류문장('EVIDENCE_NOT_FOUND', '11')).toContain('찾지 못했습니다');
  });

  // 모르는 코드까지 우리 말로 바꾸려 들면 서버가 짚어 준 것을 버리게 된다
  it('모르는 코드는 서버가 준 설명을 그대로 쓴다', () => {
    expect(요청오류문장('WHATEVER', '서버가 적어 준 사유')).toBe('서버가 적어 준 사유');
  });

  it('설명도 없으면 코드라도 남긴다', () => {
    expect(요청오류문장('WHATEVER', '')).toContain('WHATEVER');
  });
});
