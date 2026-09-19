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

  // ★ **서버가 실제로 보내는 값으로 단언한다.**
  // 문은 { error:'FORBIDDEN', need:'operator' } 를 보내고 detail 은 안 싣는다.
  // 앞선 판에서 검사가 'operator' 를 손으로 넣어 통과시키는 바람에,
  // 화면에 「이 일에는 '요청이 실패했다 (403)' 등급이 필요합니다」가 뜨는 것을 못 잡았다
  it('등급이 모자라면 그 등급 이름을 적는다', () => {
    expect(요청오류문장('FORBIDDEN', 'operator')).toContain("'실행까지'");
    expect(요청오류문장('FORBIDDEN', 'admin')).toContain("'운영'");
  });

  it('등급 이름이 아닌 값이 오면 지어내지 않는다', () => {
    for (const 이상한값 of ['요청이 실패했다 (403)', '', undefined]) {
      const 글 = 요청오류문장('FORBIDDEN', 이상한값);
      expect(글, String(이상한값)).toBe('이 일을 할 수 있는 등급이 아닙니다');
    }
  });

  // 여러 건을 걸었다 실패하면 어느 줄을 빼야 하는지 알아야 한다.
  // 서버가 이름까지 짚어 주는데 화면이 버리면 사람이 하나씩 지워 보게 된다
  it('아는 코드여도 서버가 짚어 준 것을 붙여 준다', () => {
    expect(요청오류문장('CASE_NOT_FOUND', 'XFS3B-001, XFS3B-004')).toContain('XFS3B-001');
    expect(요청오류문장('RUN_NOT_FOUND', '5867')).toContain('5867');
    expect(요청오류문장('RUN_NOT_FOUND', '5867')).toContain('찾지 못했습니다');
  });

  it('짚어 준 것이 없으면 문장만 쓴다', () => {
    expect(요청오류문장('RUN_NOT_FOUND')).not.toContain('—');
  });

  // 모르는 코드까지 우리 말로 바꾸려 들면 서버가 짚어 준 것을 버리게 된다
  it('모르는 코드는 서버가 준 설명을 그대로 쓴다', () => {
    expect(요청오류문장('WHATEVER', '서버가 적어 준 사유')).toBe('서버가 적어 준 사유');
  });

  it('설명도 없으면 코드라도 남긴다', () => {
    expect(요청오류문장('WHATEVER', '')).toContain('WHATEVER');
    expect(요청오류문장('WHATEVER')).toContain('WHATEVER');
  });

  // 설정 화면이 저장 실패에 쓰던 코드들이 같은 표에 있어야 한 화면에서 말투가 안 갈린다
  it('설정 화면이 쓰던 코드도 같은 표에 있다', () => {
    expect(요청오류문장('PREFIX_TAKEN')).toContain('이미 다른 서비스가');
    expect(요청오류문장('LAST_ADMIN')).toContain('마지막 운영 계정');
  });

  // 한국어 문장을 닫는 콜론으로 끝내지 않는다 (전역 규칙).
  // 마침표도 안 붙인다 — 설정 화면이 그렇게 쓰고 있어 여기만 다르면 한 화면에서 갈린다
  it('말투가 한 가지다 — 마침표도 닫는 콜론도 없다', () => {
    for (const code of ['SERVICE_FORBIDDEN', 'RUN_NOT_FOUND', 'PREFIX_TAKEN', 'MIXED_SERVICE']) {
      const 글 = 요청오류문장(code);
      expect(글.endsWith(':'), code).toBe(false);
      expect(글.endsWith('.'), code).toBe(false);
      expect(글.endsWith('다'), code).toBe(true);
    }
  });
});
