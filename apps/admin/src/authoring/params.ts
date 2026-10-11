// 작성 경로 번호를 읽는 한 자리. routes.ts 와 stop.ts 가 서로 부르지 않게 둘 아래에 둔다

/**
 * 경로에 실린 번호는 **열 자리 숫자 글자만** 받는다.
 *
 * **문과 라우트가 같은 값을 읽어야 한다.** `1e3` 이나 퍼센트 인코딩을 느슨하게 읽으면
 * 문이 본 번호와 라우트가 쓰는 번호가 갈리고 그 틈으로 빠져나간다 (auth/scope.ts 의 `번호로` 와 같은 규칙).
 */
export function 번호(값: unknown): number | null {
  if (typeof 값 !== 'string' || !/^\d{1,10}$/.test(값)) return null;
  const n = Number(값);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** 뿌리 params.uncoveredOf — 양의 정수만. 통로가 params 를 막지 않아 사람이 낸 값이 올 수 있다(표시 꼬리표뿐이라 막지 않는다) */
export const 밖화면뿌리 = (값: unknown): number | null => (typeof 값 === 'number' && Number.isSafeInteger(값) && 값 > 0 ? 값 : null);
