// 계정 입력값 규칙의 한 자리 — 가입·비밀번호 바꾸기·설정 만들기·add-user 가 같은 값을 쓴다 (SPEC 도메인/인증 §7)

/** 8자 미만은 PASSWORD_SHORT. 상한은 해시 계산에 긴 글자를 밀어 넣지 못하게 한다 */
export const 비밀번호최소 = 8;
export const 비밀번호최대 = 128;
