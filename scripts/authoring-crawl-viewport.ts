// 화면 크기 판정 — 같은 화면을 PC 와 모바일로 열어 견준 차이와 서비스 판정 (도메인/작성 §3.6 「화면 기록과 크롤러」 「화면 크기」 · PRD-F10-07)
// 크롤러 · 에이전트 · 서버(prd/screens.ts)가 이 하나를 쓴다 — 서버는 자식이 적은 판정을 믿지 않고 차이 목록으로 다시 가른다

/** 한 기기로 연 화면에서 읽은 것 — 크롤러가 쪽에서 모은다(authoring-crawl-page `크기읽기`) */
export interface 화면본 {
  최종: string;
  /** 문서가 화면 폭보다 넓다(가로 스크롤) */
  넘침: boolean;
  /** `<meta name="viewport" content="width=device-width …">` 가 있다 */
  선언: boolean;
  /** 구조 지문(`지문` — ariaSnapshot) */
  지문: string;
  /** 보이는 링크 · 버튼 이름 */
  조작: string[];
}

/** 화면 하나의 PC · 모바일 차이 — 찾은 화면 줄에 남는다 */
export interface 화면차이 {
  /** 모바일이 다른 주소(다른 같은 틀 · 다른 출처)로 갔으면 그 주소 — 물음표 · # 뒤는 뺀다 */
  모바일주소?: string;
  넘침: boolean;
  선언: boolean;
  구조같음: boolean;
  PC만: string[];
  모바일만: string[];
}

export type 서비스판정 = 'responsive' | 'adaptive' | 'desktop-only';
export const 판정이름: Record<서비스판정, string> = { responsive: '반응형', adaptive: '적응형', 'desktop-only': 'PC 전용' };

export const 이름상한 = 30; // 한쪽에만 있는 이름 — 화면 하나에서. 메뉴 전체가 갈리는 사이트도 줄 하나가 크지 않게
const 이름길이 = 60;

const 주소만 = (주소: string): string => {
  const u = new URL(주소);
  return `${u.origin}${u.pathname}`;
};

/**
 * PC 와 모바일로 연 같은 화면을 견준다. `틀` 은 크롤러의 같은 틀 판정(`틀키`)이다 — 번호만 다른 주소는 다른 주소가 아니다.
 * 다른 출처(m.example.com)로 갔으면 그 쪽은 안 읽어 넘침 · 선언 · 이름 칸이 비어 온다
 */
export function 화면견주기(pc: 화면본, 모바일: 화면본, 틀: (주소: string) => string): 화면차이 {
  const 다른출처 = new URL(pc.최종).origin !== new URL(모바일.최종).origin;
  const 다른주소 = 다른출처 || 틀(pc.최종) !== 틀(모바일.최종);
  const 한쪽만 = (가: string[], 나: string[]): string[] => {
    if (다른출처) return []; // 다른 출처 쪽은 안 읽었다 — PC 이름 전부가 「PC 에만」으로 뜨지 않게
    const 저쪽 = new Set(나);
    return [...new Set(가.filter((x) => !저쪽.has(x)))].sort().slice(0, 이름상한);
  };
  return {
    ...(다른주소 ? { 모바일주소: 주소만(모바일.최종) } : {}),
    넘침: 모바일.넘침,
    선언: 모바일.선언,
    구조같음: !다른출처 && pc.지문 === 모바일.지문,
    PC만: 한쪽만(pc.조작, 모바일.조작),
    모바일만: 한쪽만(모바일.조작, pc.조작),
  };
}

/**
 * 서비스 판정 — 다른 주소로 가는 화면이 하나라도 있으면 적응형, 모든 화면이 넘치거나 viewport 선언이 없으면 PC 전용, 그 밖은 반응형.
 * 견준 화면이 없으면 null(판정 없음 — 작성은 판정 전 규칙대로 간다)
 */
export function 서비스가르기(차이들: readonly 화면차이[]): 서비스판정 | null {
  if (차이들.length === 0) return null;
  if (차이들.some((x) => x.모바일주소 !== undefined)) return 'adaptive';
  if (차이들.every((x) => x.넘침 || !x.선언)) return 'desktop-only';
  return 'responsive';
}

/** 파일 · 통로로 받은 차이를 믿기 전에 모양을 본다 — 틀리면 null. 이름은 상한 · 길이로 자른다 */
export function 차이모양(값: unknown): 화면차이 | null {
  if (typeof 값 !== 'object' || 값 === null || Array.isArray(값)) return null;
  const v = 값 as Record<string, unknown>;
  const 이름들 = (x: unknown): string[] | null =>
    Array.isArray(x) && x.length <= 이름상한 && x.every((y) => typeof y === 'string') ? (x as string[]).map((y) => y.slice(0, 이름길이)) : null;
  const PC만 = 이름들(v.PC만);
  const 모바일만 = 이름들(v.모바일만);
  if (typeof v.넘침 !== 'boolean' || typeof v.선언 !== 'boolean' || typeof v.구조같음 !== 'boolean' || PC만 === null || 모바일만 === null) return null;
  if (v.모바일주소 !== undefined && (typeof v.모바일주소 !== 'string' || v.모바일주소.length > 2_000 || !/^https?:\/\//.test(v.모바일주소))) return null;
  return { ...(v.모바일주소 === undefined ? {} : { 모바일주소: v.모바일주소 as string }), 넘침: v.넘침, 선언: v.선언, 구조같음: v.구조같음, PC만, 모바일만 };
}

/** 크롤 요약 줄 — 자식이 이 줄로 케이스 기기를 고른다(tpx-cases two-kinds.md 「화면 크기 판정」) */
export function 판정줄(차이들: readonly 화면차이[], 못본: number): string {
  const 판정 = 서비스가르기(차이들);
  if (판정 === null) return `화면 크기 판정 없음(모바일로 연 화면 0장${못본 > 0 ? ` · 못 연 화면 ${못본}장` : ''})`;
  const 셈 = (f: (x: 화면차이) => boolean) => 차이들.filter(f).length;
  return (
    `화면 크기 판정 ${판정이름[판정]}(모바일로 연 화면 ${차이들.length}장 · 다른 주소 ${셈((x) => x.모바일주소 !== undefined)} · 넘침 ${셈((x) => x.넘침)}` +
    ` · viewport 선언 없음 ${셈((x) => !x.선언)} · 한쪽에만 있는 버튼 · 링크가 있는 화면 ${셈((x) => x.PC만.length + x.모바일만.length > 0)}${못본 > 0 ? ` · 못 연 화면 ${못본}장` : ''})`
  );
}
