import { describe, expect, it } from 'vitest';

import { 요청오류문장 } from './errorText.js';

describe('서버가 준 오류 코드를 사람 말로', () => {
  // 실행 결과 주소는 사람이 메신저에 붙여 나누는 링크다. 배정 안 받은 사람이
  // 그것을 누르면 접두사 글자 하나가 아니라 무슨 일인지와 빠져나갈 길을 봐야 한다
  it('배정 안 받은 애플리케이션은 무슨 일인지와 빠져나갈 길을 적는다', () => {
    const 글 = 요청오류문장('SERVICE_FORBIDDEN', 'ko', 'XFS3B');
    expect(글).toContain('배정');
    expect(글).toContain('관리자');
    expect(글).not.toBe('XFS3B');
  });

  // ★ **서버가 실제로 보내는 값으로 단언한다.**
  // 문은 { error:'FORBIDDEN', need:'runs:write' } 처럼 「기능:칸」을 보내고 detail 은 안 싣는다.
  // 앞선 판에서 검사가 값을 손으로 넣어 통과시키는 바람에,
  // 화면에 「이 일에는 '요청이 실패했다 (403)' 등급이 필요합니다」가 뜨는 것을 못 잡았다
  it('기능 칸이 모자라면 어느 기능의 무슨 칸인지 사람 말로 적는다', () => {
    expect(요청오류문장('FORBIDDEN', 'ko', 'runs:write')).toBe('이 애플리케이션에서 실행 쓰기 권한이 없습니다');
    expect(요청오류문장('FORBIDDEN', 'ko', 'cases:write')).toBe('이 애플리케이션에서 케이스 쓰기 권한이 없습니다');
    expect(요청오류문장('FORBIDDEN', 'ko', 'runs:read')).toBe('이 애플리케이션에서 실행 읽기 권한이 없습니다');
    expect(요청오류문장('FORBIDDEN', 'ko', 'authoring:write')).toBe('이 애플리케이션에서 작성 쓰기 권한이 없습니다');
    expect(요청오류문장('FORBIDDEN', 'en', 'runs:write')).not.toContain('애플리케이션');
  });

  it('관리자가 필요한 자리는 그렇게 적는다', () => {
    expect(요청오류문장('FORBIDDEN', 'ko', 'admin')).toContain('「관리자」');
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
    expect(요청오류문장('BAD_ENV', 'ko')).toBe('이 대상 서버에는 테스트 계정이 없거나 실서비스 서버로 체크돼 있습니다. 설정 > 애플리케이션에서 확인하세요');
    expect(요청오류문장('BAD_START_URL', 'ko')).toBe('시작 주소는 고른 대상 서버와 같은 주소(도메인 · 포트)여야 합니다');
    expect(요청오류문장('BAD_ENV', 'en')).not.toContain('BAD_ENV');
  });

  it('「실패 다시 실행」이 거절되면 코드 대신 사람 말에 서버가 짚은 까닭을 붙인다 (도메인/실행 §7 BAD_RERUN)', () => {
    const 문장 = 요청오류문장('BAD_RERUN', 'ko', '실행 20914은 아직 도는 중이다');
    expect(문장).toBe('이 실행으로는 실패 다시 실행을 걸 수 없습니다 — 실행 20914은 아직 도는 중이다');
    expect(요청오류문장('BAD_RERUN', 'en')).not.toContain('BAD_RERUN');
  });

  it('이어서 작성이 막히면 코드 대신 까닭을 적는다 — 둘이 동시에 누르면 뒤엣사람이 본다', () => {
    expect(요청오류문장('NOT_RESUMABLE', 'ko')).toBe(
      '이 요청은 이어서 작성할 수 없습니다. 이미 이어받았거나 보관 기간이 지났습니다. 새로 고쳐 보세요',
    );
    expect(요청오류문장('NOT_RESUMABLE', 'en')).not.toContain('NOT_RESUMABLE');
  });

  it('같은 리포트를 이미 만드는 중이면 코드 대신 사람 말에 무엇인지를 붙인다', () => {
    expect(요청오류문장('EVIDENCE_BUSY', 'ko', '실행 12의 PDF 리포트')).toBe('이미 만드는 중인 리포트입니다 — 실행 12의 PDF 리포트');
    expect(요청오류문장('EVIDENCE_BUSY', 'en')).not.toContain('EVIDENCE_BUSY');
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
    expect(요청오류문장('PREFIX_TAKEN', 'ko')).toContain('이미 다른 애플리케이션이');
    expect(요청오류문장('LAST_ADMIN', 'ko')).toContain('마지막 관리자');
    expect(요청오류문장('PROJECT_NOT_FOUND', 'ko')).toContain('그 프로젝트를 찾지 못했습니다');
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

  it('반영 안 된 작성에 막히면 열린 요청 번호를 #번호로 붙이고 영어로도 옮긴다', () => {
    expect(요청오류문장('AUTHORING_OPEN', 'ko', '14675,14680')).toBe(
      '반영하지 않은 테스트 작성 요청이 있습니다. 그 요청을 반영하거나 폐기한 뒤에 할 수 있습니다 — #14675 · #14680',
    );
    expect(요청오류문장('AUTHORING_OPEN', 'en', '14675')).toMatch(/^[^가-힣]+ — #14675$/);
  });

  it('고칠 내용이 틀리면 서버가 짚은 케이스와 칸을 같이 보인다', () => {
    expect(요청오류문장('BAD_EDIT', 'ko', 'PAY-001.state')).toContain('PAY-001.state');
  });

  it.each([
    ['SCENARIO_NOT_FOUND', '그 시나리오를 찾지 못했습니다'],
    ['SCENARIO_ARCHIVED', '삭제한 시나리오라 고치거나 실행할 수 없습니다'],
    ['SCENARIO_NOT_RUNNABLE', '지금은 실행할 수 없는 시나리오입니다'],
    ['STALE_VERSION', '다른 사람이 먼저 저장했습니다. 새로 고침하면 지금 고친 내용이 사라집니다'],
  ])('시나리오의 %s 도 사람 말로 적고 영어로 옮긴다', (code, 문장) => {
    expect(요청오류문장(code, 'ko')).toBe(문장);
    expect(요청오류문장(code, 'en')).not.toMatch(/[가-힣]/);
  });

  it.each([
    ['FARM_OFF', '이 서버에는 Android 앱을 돌릴 Device VISION 이 연결되어 있지 않습니다'],
    ['DEVICE_BUSY', '디바이스가 다른 실행에 쓰이고 있습니다'],
  ])('Android 앱 실행의 %s 도 사람 말로 적고 영어로 옮긴다', (code, 문장) => {
    expect(요청오류문장(code, 'ko')).toBe(문장);
    expect(문장.endsWith('.')).toBe(false);
    expect(문장.endsWith('다')).toBe(true);
    expect(요청오류문장(code, 'en')).not.toMatch(/[가-힣]/);
    expect(요청오류문장(code, 'en')).not.toContain(code);
  });

  it('아이디 모양은 서버 규칙을 그대로 말한다', () => {
    expect(요청오류문장('USERNAME_SHAPE', 'ko')).toBe('아이디는 영문 소문자·숫자·.·_·- 로 2~32자입니다');
  });
});
