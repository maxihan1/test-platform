// 마크다운 표(요구사항 · 제외 표) 읽기 — 원장 대조와 계정 보류 읽기가 같은 줄을 같은 차례로 보게 한 곳에 둔다

/** 마크다운 표 한 줄을 칸으로. `\|` 는 칸 가름이 아니다 */
function 칸들(줄: string): string[] {
  return 줄
    .trim()
    .replace(/^\||\|$/g, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim());
}

/** 절 아래 표의 몸 줄마다 글 안 줄 차례 · 머리 칸 · 칸. 읽기와 번호 채우기가 같은 줄을 같은 차례로 보게 한 곳에 둔다 */
export function 표몸줄들(줄들: string[], 제목: string): { 줄: number; 머리: string[]; 칸: string[] }[] {
  const 시작 = 줄들.findIndex((l) => new RegExp(`^##\\s+${제목}\\s*$`).test(l.trim()));
  if (시작 < 0) return [];
  const 몸: { 줄: number; 머리: string[]; 칸: string[] }[] = [];
  let 머리: string[] | null = null;
  for (let i = 시작 + 1; i < 줄들.length; i++) {
    const l = 줄들[i] ?? '';
    if (/^#{1,2}\s/.test(l)) break;
    if (!l.trim().startsWith('|')) {
      // 표가 끝났다 — 다음 표는 머리 줄부터 다시 읽는다
      머리 = null;
      continue;
    }
    const 칸 = 칸들(l);
    if (머리 === null) {
      머리 = 칸;
      continue;
    }
    if (칸.every((c) => /^:?-+:?$/.test(c))) continue;
    몸.push({ 줄: i, 머리, 칸 });
  }
  return 몸;
}

/** `## <제목>` 절 아래 표를 전부(### 소제목으로 나눠도) 머리 칸 이름으로 읽는다. 다음 `#`·`##` 에서 멈춘다. 절이 없으면 빈 배열 */
export function 표읽기(글: string, 제목: string): Record<string, string>[] {
  return 표몸줄들(글.split(/\r?\n/), 제목).map(({ 머리, 칸 }) => Object.fromEntries(머리.map((h, i) => [h, 칸[i] ?? ''])));
}

export const 백틱벗기기 = (글: string) => 글.trim().replace(/^`(.*)`$/, '$1').trim();
