// 작성 경로 번호 · 재실행이 물려받는 params 를 읽는 한 자리. routes.ts 와 stop.ts 가 서로 부르지 않게 둘 아래에 둔다

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

/**
 * 재실행이 원본에서 물려받는 params. 고칠 내용은 원본 것만 — 본문 params 로 다른 edits 를 실으면 검사 안 거친 고침이 줄에 선다.
 * 반영 요청의 재실행은 같은 반영을 다시 한다 — 원본의 prdApply · screenRight · apiApply 를 물려받는다 (§7 「표준 기획서 통로」 · 도메인/API §7).
 * 결정 진행이 세운 요청(params.decision)은 count 만 물려받고 after 는 비운다 — 앞 일은 이미 끝났고 지금 열린 작성은 서버 막기가 본다 (§7 「결정 목록 통로」)
 */
export function 물려받을값(행: { kind: string; params: Record<string, unknown> }, 값: Record<string, unknown>): Record<string, unknown> {
  const p = 행.params;
  if (행.kind === 'EDIT') return { edits: p.edits };
  const 결정 = 결정수(p.decision);
  const 더할 = 결정 === null ? {} : { decision: { after: [], count: 결정 } };
  if (p.prdApply === true) return { ...값, prdApply: true, ...(p.screenRight === undefined ? {} : { screenRight: p.screenRight }), ...더할 };
  return { ...값, ...(p.apiApply === undefined ? {} : { apiApply: p.apiApply }), ...더할 };
}

/** params.decision 의 count — 결정 진행이 세운 요청이 아니면 null */
export function 결정수(값: unknown): number | null {
  const count = typeof 값 === 'object' && 값 !== null ? (값 as { count?: unknown }).count : undefined;
  return typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 ? count : null;
}
