// 프로젝트 노트 문서의 상한 · 차례 · 겹치기 규칙 — 받는 통로와 노트 고치는 자식 지시문이 같이 읽는다 (도메인/BTS 「맥락 — 프로젝트 노트」)

/** 노트 문서 하나. body 는 md 글이다 */
export interface 노트문서 {
  name: string;
  summary: string;
  body: string;
}

/** 상한의 정본은 여기다 — 명세는 이 숫자를 가리킨다 */
export const 노트상한 = {
  본문: 4000,
  설명: 120,
  이름: 40,
  문서: 40,
  최근줄: 30,
} as const;

/** 늘 있는 문서 다섯. 목차 맨 앞에 이 차례로 선다 */
export const 늘있는문서 = ['한눈에', '최근 바뀐 것', '자주 깨지는 곳', '테스트 요령', '더 볼 곳'] as const;

const 지난기록꼴 = /^지난 기록 \d{4}-(0[1-9]|1[0-2])$/;

export type 노트겹침 = { ok: true; docs: 노트문서[] } | { ok: false; error: 'NOTE_TOO_LONG' | 'BAD_NOTE'; detail: string };

/** 목록 줄(「- 」 · 「* 」 · 「1. 」로 여는 줄) 수 — 「최근 바뀐 것」 30줄 상한이 센다 */
function 목록줄수(md: string): number {
  return md.split('\n').filter((줄) => /^\s*([-*]|\d+\.)\s/.test(줄)).length;
}

/** 늘 있는 다섯 → 기능 문서(받은 차례 그대로) → 지난 기록(오래된 달부터) */
function 차례(docs: 노트문서[]): 노트문서[] {
  const 고정 = 늘있는문서.flatMap((이름) => docs.filter((d) => d.name === 이름));
  const 지난 = docs.filter((d) => 지난기록꼴.test(d.name)).sort((a, b) => a.name.localeCompare(b.name));
  const 기능 = docs.filter((d) => !(늘있는문서 as readonly string[]).includes(d.name) && !지난기록꼴.test(d.name));
  return [...고정, ...기능, ...지난];
}

/**
 * 앞 판에 바뀐 문서를 이름으로 겹친다. 안 바뀐 문서를 AI 가 다시 쓰다 흐트러지지 않게 바뀐 것만 받는다.
 * 늘 있는 다섯은 지울 수 없고 겹친 뒤에 다 있어야 한다 — 처음 판도 다섯을 다 보내야 선다
 */
export function 노트겹치기(앞: 노트문서[], 들어온: 노트문서[], 지울: string[] = []): 노트겹침 {
  const 이름들 = new Set<string>();
  for (const d of 들어온) {
    const 이름 = d.name.trim();
    if (이름 === '') return { ok: false, error: 'BAD_NOTE', detail: '이름 없는 문서' };
    if (이름들.has(이름)) return { ok: false, error: 'BAD_NOTE', detail: `같은 이름 둘: ${이름}` };
    이름들.add(이름);
    if (이름.length > 노트상한.이름) return { ok: false, error: 'NOTE_TOO_LONG', detail: `이름 ${노트상한.이름}자 넘음: ${이름.slice(0, 노트상한.이름)}…` };
    if (d.summary.length > 노트상한.설명) return { ok: false, error: 'NOTE_TOO_LONG', detail: `${이름} 한 줄 설명 ${노트상한.설명}자 넘음` };
    if (d.body.length > 노트상한.본문) return { ok: false, error: 'NOTE_TOO_LONG', detail: `${이름} 본문 ${노트상한.본문}자 넘음(${d.body.length}자)` };
  }
  const 지울이름 = 지울.map((이름) => 이름.trim());
  const 고정지움 = 지울이름.find((이름) => (늘있는문서 as readonly string[]).includes(이름));
  if (고정지움 !== undefined) return { ok: false, error: 'BAD_NOTE', detail: `늘 있는 문서는 못 지운다: ${고정지움}` };
  // 없는 이름을 지우라 하거나 쓰면서 지우라 하면 AI 가 무엇을 하려 했는지 모른다 — 말없이 넘기지 않고 이름을 붙여 돌려보낸다
  const 엇난지움 = 지울이름.find((이름) => !앞.some((d) => d.name === 이름) || 이름들.has(이름));
  if (엇난지움 !== undefined) return { ok: false, error: 'BAD_NOTE', detail: `지울 수 없는 이름: ${엇난지움}` };
  const 받은 = new Map(들어온.map((d) => [d.name.trim(), { name: d.name.trim(), summary: d.summary, body: d.body }]));
  // 바뀐 문서는 앞 판 자리에서 바꿔 끼운다 — 뒤로 보내면 기능 문서 차례가 판마다 흔들린다. 새 이름만 뒤에 붙는다
  const 제자리 = 앞.filter((d) => !지울이름.includes(d.name)).map((d) => 받은.get(d.name) ?? d);
  const 새것 = [...받은.values()].filter((d) => !앞.some((a) => a.name === d.name));
  const 겹침 = 차례([...제자리, ...새것]);
  if (겹침.length > 노트상한.문서) return { ok: false, error: 'NOTE_TOO_LONG', detail: `문서 ${노트상한.문서}개 넘음(${겹침.length}개)` };
  const 빠짐 = 늘있는문서.find((이름) => !겹침.some((d) => d.name === 이름));
  if (빠짐 !== undefined) return { ok: false, error: 'BAD_NOTE', detail: `늘 있는 문서가 빠졌다: ${빠짐}` };
  const 최근 = 겹침.find((d) => d.name === '최근 바뀐 것');
  if (최근 !== undefined && 목록줄수(최근.body) > 노트상한.최근줄) {
    return { ok: false, error: 'BAD_NOTE', detail: `최근 바뀐 것 ${노트상한.최근줄}줄 넘음 — 오래된 줄은 「지난 기록 YYYY-MM」으로 옮긴다` };
  }
  return { ok: true, docs: 겹침 };
}
