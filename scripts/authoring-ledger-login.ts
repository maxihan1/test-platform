// 원장 표 「로그인」 열 — 머리 칸과 행 칸을 맞춰 값을 읽는다(AUT-F3-45). 줄을 요구 번호에 나누는 쪽은 authoring-ledger.ts 번호글들이다
// 행 글에는 열 이름이 없어 판정 함수(authoring-design.ts)가 「예」의 뜻을 모른다. 그래서 원장을 뽑을 때 표 구조로 읽는다

/** 요구 번호가 첫 칸인 표 행 하나와 그때의 머리 칸. `줄마다` 는 칸마다 줄이 나뉜 맥 변환(textutil) 행이다 */
export interface 표행 {
  머리: string[];
  칸: string[];
  줄마다: boolean;
}

const 로그인머리 = /^(?:로그인|인증)(?:\s*(?:필요|여부))?$/;
// 「작성만 예」 · 「저장만 관리자」처럼 일부만인 값도 묶음이다. O · ✓ 같은 기호로 적는 표도 흔하다
const 로그인값 = /(?:^|\s)(?:예|필요|관리자)$|^(?:[OYV○●✓✔]|Yes)$/i;

/** 칸 — md · 격자 표는 테두리 글자(칸 안의 `\|` 는 글자다), 서버 변환은 넓은 빈칸 · 탭, 맥 변환은 줄 하나가 칸 하나다 */
export const 칸들 = (줄: string): string[] =>
  (/^[│|]/.test(줄) ? 줄.replace(/^[│|]|(?<!\\)[│|]$/g, '').split(/(?<!\\)[│|]/) : 줄.split(/\t|\s{2,}/)).map((c) => c.trim());

/** 표 행마다 「로그인」 열 값 — 예 · 필요 · 관리자 · 기호인 번호만. 머리 칸 수와 행 칸 수가 같을 때만 맞춘다 */
export function 로그인열(행: ReadonlyMap<string, 표행>): Map<string, string> {
  const 로그인 = new Map<string, string>();
  for (const [번호, { 머리, 칸, 줄마다 }] of 행) {
    // 맥 변환 머리는 제목 뒤 주인 없는 줄을 다 모아 앞에 안내 문장이 낄 수 있고, 행 번호 칸(숫자만 있는 줄)은 행에서 빠진다 — 뒤에서부터 맞춘다
    const 머 = 줄마다 ? 머리.slice(-칸.length) : 머리;
    const 값 = 칸[머.findIndex((c) => 로그인머리.test(c))];
    if (머.length === 칸.length && 값 !== undefined && 로그인값.test(값)) 로그인.set(번호, 값);
  }
  return 로그인;
}
