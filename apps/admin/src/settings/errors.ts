// 설정 API 가 던지는 오류 — routes.ts 의 에러 처리기가 상태 코드로 옮긴다
// store.ts 에서 뗐다: 대상 서버 줄 저장(envs.ts)도 던져야 하는데 store.ts 를 부르면 서로 부르는 고리가 생긴다

export type 오류코드 =
  | 'PREFIX_TAKEN'
  | 'USERNAME_TAKEN'
  | 'LAST_ADMIN'
  | 'NOT_FOUND'
  | 'PROJECT_NOT_FOUND'
  | 'ALREADY_APPROVED'
  | 'APPROVED_USER'
  | 'NOT_APPROVED'
  | 'API_AUTH_SECRET_REQUIRED'
  | 'ADMIN_KEY_VALUE_REQUIRED';

export class 설정오류 extends Error {
  constructor(readonly code: 오류코드) {
    super(code);
  }
}
