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

/**
 * `## <제목>` 절 표에서 `기대`(몸 줄 차례 → 새 글)가 있는 줄의 `열` 칸만 고쳐 쓴다 — 번호 명령이 tcId 칸 · 프로시저 칸을 채운다.
 * 다른 칸 · 다른 절 · 줄 끝 `\r` · 칸의 백틱은 그대로 둔다
 */
export function 칸채우기(표글: string, 제목: string, 열이름: string, 기대: ReadonlyMap<number, string>): string {
  const 줄들 = 표글.split('\n');
  표몸줄들(줄들, 제목).forEach(({ 줄, 머리 }, 차례) => {
    const 새 = 기대.get(차례);
    const 열 = 머리.indexOf(열이름);
    if (새 === undefined || 열 < 0) return;
    const 원 = 줄들[줄] ?? '';
    const 끝 = 원.endsWith('\r') ? '\r' : '';
    const 몸 = 원.slice(0, 원.length - 끝.length);
    const 조각 = 몸.split(/(?<!\\)\|/);
    const 앞 = 몸.trim().startsWith('|') ? 1 : 0;
    const 자리 = 열 + 앞;
    // 칸이 모자란 줄은 둔다 — 끝 가름 자리에 쓰면 표가 깨진다. 대조가 어긋남으로 보인다
    if (자리 >= 조각.length - (몸.trimEnd().endsWith('|') ? 1 : 0)) return;
    const 옛 = (조각[자리] ?? '').trim();
    if (백틱벗기기(옛) === 새) return;
    조각[자리] = ` ${옛.startsWith('`') ? `\`${새}\`` : 새} `;
    줄들[줄] = 조각.join('|') + 끝;
  });
  return 줄들.join('\n');
}
