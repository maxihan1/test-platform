// 게임 화면 파일 열쇠의 무늬 — 케이스 주소가 표시한 자리(`game:*` 장면 · 이름 안 `:n`)만 넓게 본다 (도메인/작성 §3.6 「세는 방식」)
// authoring-crawl-rules.ts 가 300줄을 넘어 떼어 냈다. 견주는 함수는 거기 `틀닿나` · `틀케이스` 다

const 무늬들 = new Map<string, RegExp | null>();

const 글자로 = (글: string): string => 글.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 화면 파일 틀이 무늬면 찾은 화면 열쇠에 맞춰 볼 정규식, 아니면 null(글자가 같아야 한다).
 * 장면 자리 `*` 는 아무 장면 하나, 이름 안 `:n`(뒤에 영숫자가 안 붙은 것)은 숫자 하나 이상이다.
 * 장면 첫 화면(`game:<장면>`)과 장소(`…/zone:…`)는 무늬로 읽지 않는다 — 장면 하나 · 구역 하나가 그 화면이다.
 * Commander 가 혼자 숫자 · 장면을 무시하면 `Window 1` · `Window 2` 같은 다른 창이 뭉개진다 — 케이스가 표시한 자리만 넓힌다
 */
export function 게임무늬(파일틀: string): RegExp | null {
  if (무늬들.has(파일틀)) return 무늬들.get(파일틀)!;
  const m = /^game:([^/]+)(\/.+)$/.exec(파일틀);
  const 무늬 =
    m === null || m[2]!.includes('/zone:') || (m[1] !== '*' && !/:n(?![A-Za-z0-9_])/.test(m[2]!))
      ? null
      : new RegExp(`^game:${m[1] === '*' ? '[^/]+' : 글자로(m[1]!)}${글자로(m[2]!).replace(/:n(?![A-Za-z0-9_])/g, '\\d+')}$`);
  무늬들.set(파일틀, 무늬);
  return 무늬;
}

/** 찾은 화면 열쇠가 화면 파일 틀들 가운데 무늬 하나에 맞나 */
export const 게임무늬닿나 = (틀: string, 파일틀: Iterable<string>): boolean => [...파일틀].some((f) => 게임무늬(f)?.test(틀) === true);
