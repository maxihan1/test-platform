import { describe, expect, it } from 'vitest';

import { 요청오류문장 } from './errorText.js';

describe('서버가 준 오류 코드를 사람 말로', () => {
  // 실행 결과 주소는 사람이 메신저에 붙여 나누는 링크다. 배정 안 받은 사람이
  // 그것을 누르면 접두사 글자 하나가 아니라 무슨 일인지와 빠져나갈 길을 봐야 한다
  it('배정 안 받은 서비스는 무슨 일인지와 빠져나갈 길을 적는다', () => {
    const 글 = 요청오류문장('SERVICE_FORBIDDEN', 'ko', 'XFS3B');
    expect(글).toContain('배정');
    expect(글).toContain('운영 계정');
    expect(글).not.toBe('XFS3B');
  });

  // ★ **서버가 실제로 보내는 값으로 단언한다.**
  // 문은 { error:'FORBIDDEN', need:'runs:write' } 처럼 「기능:칸」을 보내고 detail 은 안 싣는다.
  // 앞선 판에서 검사가 값을 손으로 넣어 통과시키는 바람에,
  // 화면에 「이 일에는 '요청이 실패했다 (403)' 등급이 필요합니다」가 뜨는 것을 못 잡았다
  it('기능 칸이 모자라면 어느 기능의 무슨 칸인지 사람 말로 적는다', () => {
    expect(요청오류문장('FORBIDDEN', 'ko', 'runs:write')).toBe('이 서비스에서 실행 쓰기 권한이 없습니다');
    expect(요청오류문장('FORBIDDEN', 'ko', 'cases:write')).toBe('이 서비스에서 케이스 쓰기 권한이 없습니다');
    expect(요청오류문장('FORBIDDEN', 'ko', 'runs:read')).toBe('이 서비스에서 실행 읽기 권한이 없습니다');
    expect(요청오류문장('FORBIDDEN', 'ko', 'authoring:write')).toBe('이 서비스에서 작성 쓰기 권한이 없습니다');
    expect(요청오류문장('FORBIDDEN', 'en', 'runs:write')).not.toContain('서비스');
  });

  it('운영 계정이 필요한 자리는 그렇게 적는다', () => {
    expect(요청오류문장('FORBIDDEN', 'ko', 'admin')).toContain('「운영」');
  });

  it('모르는 값이 오면 지어내지 않는다', () => {
    for (const 이상한값 of ['요청이 실패했다 (403)', '', undefined, 'operator', 'runs:delete']) {
      const 글 = 요청오류문장('FORBIDDEN', 'ko', 이상한값);
      expect(글, String(이상한값)).toBe('이 일을 할 수 있는 등급이 아닙니다');
    }
  });

  // 여러 건을 걸었다 실패하면 어느 줄을 빼야 하는지 알아야 한다.
  // 서버가 이름까지 짚어 주는데 화면이 버리면 사람이 하나씩 지워 보게 된다
  it('아는 코드여도 서버가 짚어 준 것을 붙여 준다', () => {
    expect(요청오류문장('CASE_NOT_FOUND', 'ko', 'XFS3B-001, XFS3B-004')).toContain('XFS3B-001');
    expect(요청오류문장('RUN_NOT_FOUND', 'ko', '5867')).toContain('5867');
    expect(요청오류문장('RUN_NOT_FOUND', 'ko', '5867')).toContain('찾지 못했습니다');
  });

  it('대조 요청을 다시 작성하다 대상 서버가 어긋나면 코드 대신 사람 말로 적는다', () => {
    expect(요청오류문장('BAD_ENV', 'ko')).toBe('이 대상 서버에는 테스트 계정이 없습니다. 설정 > 서비스에서 테스트 계정을 넣으세요');
    expect(요청오류문장('BAD_START_URL', 'ko')).toBe('시작 주소는 고른 대상 서버와 같은 주소(도메인 · 포트)여야 합니다');
    expect(요청오류문장('BAD_ENV', 'en')).not.toContain('BAD_ENV');
  });

  it('이어서 작성이 막히면 코드 대신 까닭을 적는다 — 둘이 동시에 누르면 뒤엣사람이 본다', () => {
    expect(요청오류문장('NOT_RESUMABLE', 'ko')).toBe(
      '이 요청은 이어서 작성할 수 없습니다. 이미 이어받았거나 보관 기간이 지났습니다. 새로 고쳐 보세요',
    );
    expect(요청오류문장('NOT_RESUMABLE', 'en')).not.toContain('NOT_RESUMABLE');
  });

  it('짚어 준 것이 없으면 문장만 쓴다', () => {
    expect(요청오류문장('RUN_NOT_FOUND', 'ko')).not.toContain('—');
  });

  // 모르는 코드까지 우리 말로 바꾸려 들면 서버가 짚어 준 것을 버리게 된다
  it('모르는 코드는 서버가 준 설명을 그대로 쓴다', () => {
    expect(요청오류문장('WHATEVER', 'ko', '서버가 적어 준 사유')).toBe('서버가 적어 준 사유');
  });

  it('설명도 없으면 코드라도 남긴다', () => {
    expect(요청오류문장('WHATEVER', 'ko', '')).toContain('WHATEVER');
    expect(요청오류문장('WHATEVER', 'ko')).toContain('WHATEVER');
  });

  // 설정 화면이 저장 실패에 쓰던 코드들이 같은 표에 있어야 한 화면에서 말투가 안 갈린다
  it('설정 화면이 쓰던 코드도 같은 표에 있다', () => {
    expect(요청오류문장('PREFIX_TAKEN', 'ko')).toContain('이미 다른 서비스가');
    expect(요청오류문장('LAST_ADMIN', 'ko')).toContain('마지막 운영 계정');
  });

  // 한국어 문장을 닫는 콜론으로 끝내지 않는다 (전역 규칙).
  // 마침표도 안 붙인다 — 설정 화면이 그렇게 쓰고 있어 여기만 다르면 한 화면에서 갈린다
  it('말투가 한 가지다 — 마침표도 닫는 콜론도 없다', () => {
    for (const code of ['SERVICE_FORBIDDEN', 'RUN_NOT_FOUND', 'PREFIX_TAKEN', 'MIXED_SERVICE']) {
      const 글 = 요청오류문장(code, 'ko');
      expect(글.endsWith(':'), code).toBe(false);
      expect(글.endsWith('.'), code).toBe(false);
      expect(글.endsWith('다'), code).toBe(true);
    }
  });

  it.each(['NOT_MERGED', 'ALREADY_CONTINUED', 'NOTHING_LEFT', 'BAD_SOURCE'])(
    '남은 요구로 이어 작성의 %s 도 같은 말투로 적고 영어로 옮긴다',
    (code) => {
      const 한국어 = 요청오류문장(code, 'ko');
      expect(한국어).not.toContain(code);
      expect(한국어.endsWith('.'), code).toBe(false);
      expect(한국어.endsWith('다'), code).toBe(true);
      expect(요청오류문장(code, 'en')).not.toBe(한국어);
    },
  );

  it.each(['USERNAME_SHAPE', 'PASSWORD_CHANGE_REQUIRED', 'NOT_APPROVED', 'ALREADY_APPROVED', 'APPROVED_USER', 'PENDING_APPROVAL'])(
    '계정 코드 %s 도 사람 말로 적고 영어로도 옮긴다',
    (code) => {
      const 한국어 = 요청오류문장(code, 'ko');
      const 영어 = 요청오류문장(code, 'en');
      expect(한국어).not.toContain(code);
      expect(한국어).not.toContain('요청이 실패했습니다');
      expect(영어).not.toBe(한국어);
      expect(영어).not.toMatch(/[가-힣]/);
    },
  );

  it.each(['BAD_EDIT', 'EDIT_OPEN'])('케이스 고치기의 %s 도 같은 말투로 적고 영어로 옮긴다', (code) => {
    const 한국어 = 요청오류문장(code, 'ko');
    const 영어 = 요청오류문장(code, 'en');
    expect(한국어).not.toContain(code);
    expect(한국어.endsWith('.'), code).toBe(false);
    expect(한국어.endsWith('다'), code).toBe(true);
    expect(영어).not.toMatch(/[가-힣]/);
  });

  it('고칠 내용이 틀리면 서버가 짚은 케이스와 칸을 같이 보인다', () => {
    expect(요청오류문장('BAD_EDIT', 'ko', 'PAY-001.state')).toContain('PAY-001.state');
  });

  it('아이디 모양은 서버 규칙을 그대로 말한다', () => {
    expect(요청오류문장('USERNAME_SHAPE', 'ko')).toBe('아이디는 영문 소문자·숫자·.·_·- 로 2~32자입니다');
  });
});
