// 계정 입력값 규칙의 한 자리 — 가입·비밀번호 바꾸기·설정 만들기·add-user 가 같은 값을 쓴다 (SPEC 도메인/인증 §7)

/** 소문자·숫자·`.`·`_`·`-`, 2~32자, 첫 글자는 소문자나 숫자. 대문자로 흉내 낸 `Admin` 을 막는다 */
export const 아이디모양 = /^[a-z0-9][a-z0-9._-]{1,31}$/;

export const 이름최소 = 1;
export const 이름최대 = 50;

/** 8자 미만은 PASSWORD_SHORT. 상한은 해시 계산에 긴 글자를 밀어 넣지 못하게 한다 */
export const 비밀번호최소 = 8;
export const 비밀번호최대 = 128;
