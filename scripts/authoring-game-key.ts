// 게임 화면 파일 열쇠의 무늬 — 케이스 주소가 표시한 자리(`game:*` 장면 · 이름 안 `:n`)만 넓게 본다 (도메인/작성 §3.6 「세는 방식」)
// authoring-crawl-rules.ts 가 300줄을 넘어 떼어 냈다. 견주는 함수는 거기 `틀닿나` · `틀케이스` 다

// 무늬인 틀만 담는다 — 웹 주소 · 앱 열쇠 · 무늬 없는 게임 열쇠까지 담으면 오래 도는 admin 에서 끝없이 는다
const 무늬들 = new Map<string, RegExp>();

const 글자로 = (글: string): string => 글.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// 뒤에 글자(한글 포함) · 숫자가 붙은 `:n` 은 이름의 일부다(`Gate:north` · `Rank:n위`)
const 번호자리 = /:n(?![\p{L}\p{N}_])/u;

/**
 * 화면 파일 틀이 무늬면 찾은 화면 열쇠에 맞춰 볼 정규식, 아니면 null(글자가 같아야 한다).
 * 장면 자리 `*` 는 아무 장면 하나, 이름 안 `:n` 은 숫자 하나 이상이다.
 * 장면 첫 화면(`game:<장면>`)과 장소(`…/zone:…`)는 무늬로 읽지 않는다 — 장면 하나 · 구역 하나가 그 화면이다.
 * Commander 가 혼자 숫자 · 장면을 무시하면 `Window 1` · `Window 2` 같은 다른 창이 뭉개진다 — 케이스가 표시한 자리만 넓힌다
 */
export function 게임무늬(파일틀: string): RegExp | null {
  const 있던 = 무늬들.get(파일틀);
  if (있던 !== undefined) return 있던;
  const m = /^game:([^/]+)(\/.+)$/.exec(파일틀);
  if (m === null || m[2]!.includes('/zone:') || (m[1] !== '*' && !번호자리.test(m[2]!))) return null;
  const 경로 = m[2]!.split(new RegExp(번호자리.source, 'gu')).map(글자로).join('\\d+');
  const 무늬 = new RegExp(`^game:${m[1] === '*' ? '[^/]+' : 글자로(m[1]!)}${경로}$`, 'u');
  무늬들.set(파일틀, 무늬);
  return 무늬;
}

/**
 * 화면 파일 틀과 그 위 창들(가까운 것부터) — 케이스가 창 안 요소를 읽으면 그 창도 들른 것이다(2026-11-23 사용자).
 * 장면 첫 화면(`game:<장면>`)은 넣지 않는다 — 글자 하나 읽고 장면 전체를 덮지 않게. 장소(`/zone:`)가 든 틀은 자기만이다
 */
function 후보들(파일틀: string): string[] {
  const m = /^(game:[^/]+)\/(.+)$/.exec(파일틀);
  if (m === null || m[2]!.includes('zone:')) return [파일틀];
  const 마디 = m[2]!.split('/');
  return 마디.map((_, i) => `${m[1]}/${마디.slice(0, 마디.length - i).join('/')}`);
}

const 맞나 = (후보: string, 찾은틀: string): boolean => 후보 === 찾은틀 || 게임무늬(후보)?.test(찾은틀) === true;

/** 찾은 게임 화면 열쇠가 화면 파일 틀들(무늬 · 위 창 포함)에 닿나. 게임 열쇠가 아니면 늘 아니다 */
export function 게임틀닿나(틀: string, 파일틀: Iterable<string>): boolean {
  if (!틀.startsWith('game:')) return false;
  for (const f of 파일틀) if (후보들(f).some((c) => 맞나(c, 틀))) return true;
  return false;
}

/** 찾은 게임 화면 열쇠에 무늬 · 위 창으로 닿는 화면 파일 틀의 케이스 — 같은 글자의 틀은 부르는 쪽이 따로 모은다 */
export function 게임틀케이스(틀: string, 지도: ReadonlyMap<string, readonly string[]>): string[] {
  if (!틀.startsWith('game:')) return [];
  return [...지도].filter(([k]) => k !== 틀 && 후보들(k).some((c) => 맞나(c, 틀))).flatMap(([, v]) => v);
}

/** 화면 파일 틀(무늬 · 요소일 수 있다)이 닿는 찾은 화면 열쇠들 — 호환성이 게임 여는 주소 대신 이것을 화면으로 센다 */
export function 닿는찾은화면(파일틀: string, 찾은: ReadonlySet<string>): string[] {
  const 모음 = new Set<string>();
  for (const c of 후보들(파일틀)) {
    if (찾은.has(c)) 모음.add(c);
    const 무늬 = 게임무늬(c);
    if (무늬 !== null) for (const k of 찾은) if (무늬.test(k)) 모음.add(k);
  }
  return [...모음];
}
