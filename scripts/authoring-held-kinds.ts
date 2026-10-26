// 남은 보류를 애초에 안 나오게 하는 길로 가른다 — 빠른 검사가 막지 않고 경고만 한다 (SPEC 도메인/작성 §3.6 「★ 보류 케이스」 「애초에 안 나오게」)

export type 보류갈래 = '판정 불가' | '값 다름' | '그 밖';

const 갈래차례: readonly 보류갈래[] = ['판정 불가', '값 다름', '그 밖'];

const 길: Record<보류갈래, string> = {
  '판정 불가': '기준은 표준 기획서 「확인 필요」 항목으로 묻고 케이스는 기준 없이 되는 꼴로 쓴다(tpx-cases 5-writing.md 「기준 없는 말」)',
  '값 다름': '보류하지 않고 빨간 채로 두고 결과 요약 「기획서와 다름」 줄에 싣는다(tpx-cases 6-gates.md 종료 조건 1)',
  '그 밖': '데이터는 API 로 찾거나 만들고 미리 아는 한계는 요구째 제외 「환경 한계」로 뺀다(tpx-cases 5-writing.md 「보류 · 모킹 필요로 빼기 전에」)',
};

/**
 * 사유 머리로 가른다. 데이터 없음과 환경 한계는 사유가 자유 문장이라 「그 밖」 하나로 센다.
 * 서버 오류 · 끊김(환경 탓)과 자료 어긋남(사람이 둘 중 고른다)은 보류가 맞아 null
 */
export function 보류갈래(사유: string): 보류갈래 | null {
  const s = 사유.trim();
  if ((s.startsWith('판정 불가') && s.includes('자료 어긋남')) || /^보류 — (서버 오류|끊김)/.test(s)) return null;
  if (s.startsWith('판정 불가')) return '판정 불가';
  // kit 이 판정이 틀린 케이스를 「검증 실패: <문장>」으로 던진다 — 같은 까닭 3회 빨강을 보류로 단 것이다. 에러 첫 줄을 그대로 옮기면 「Error: 」가 붙는다
  if (/^보류 — (Error: )?검증 실패/.test(s)) return '값 다름';
  return '그 밖';
}

/** 케이스마다 읽은 `held` 를 갈래마다 한 줄로. `볼` 이 있으면 그 tcId 만. 글자가 아닌 held 는 읽은 쪽이 빼 둔다(K13 몫) */
export function 보류경고(케이스들: readonly { tcId: string; held?: string }[], 볼?: ReadonlySet<string>): string[] {
  const 모음 = new Map<보류갈래, string[]>();
  for (const { tcId, held } of 케이스들) {
    if (held === undefined || (볼 !== undefined && !볼.has(tcId))) continue;
    const 갈래 = 보류갈래(held);
    if (갈래 !== null) 모음.set(갈래, [...(모음.get(갈래) ?? []), tcId]);
  }
  return 갈래차례.flatMap((k) => {
    const t = 모음.get(k);
    return t === undefined ? [] : [`${k} ${String(t.length)}건 — ${길[k]}: ${t.join(' · ')}`];
  });
}
