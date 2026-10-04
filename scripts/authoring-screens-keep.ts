// 화면 기록 저장본 판정 — 바뀌지 않은 화면은 다시 훑지 않게 (도메인/작성 §3.6 「★ 역방향」 · 2026-10-04). 디스크 I/O 는 authoring-screens-keep-io.ts
import { createHash } from 'node:crypto';

export type 상태 = '로그아웃' | '로그인';

export interface 저장항목 {
  /** `<상태> <틀>` — 실행마다 바뀌는 크롤 번호 대신 이것으로 맞춘다 */
  키: string;
  상태: 상태;
  틀: string;
  주소: string;
  /** 구조 지문(요소 짜임) */
  지문: string;
  /** 글자 지문 — 크롤 파일 전체(입력칸 머리 포함). 이것까지 같아야 저장 기록을 그대로 쓴다 */
  글자지문: string;
  /** 저장 폴더 안 기록 파일 이름 */
  기록: string;
  /** 훑은 날 YYYY-MM-DD */
  훑은날: string;
}

export interface 저장본 {
  판: 1;
  항목: 저장항목[];
}

export interface 목록칸 {
  주소: string;
  상태: 상태;
  틀: string;
  지문: string;
  글자지문: string;
}

/** 이 날수를 넘은 기록은 바뀐 것으로 본다 — 지문이 못 잡는 변화(팝업 안 · 오류 문구)를 언젠가는 다시 본다 */
export const 다시훑는날수 = 30;

const 기록이름꼴 = /^(?:in|out)-[0-9a-f]{12}\.md$/;
const 날꼴 = /^\d{4}-\d{2}-\d{2}$/;

/** 저장 폴더의 index.json 을 믿기 전에 모양을 본다 — 틀린 항목은 빼고, 판이 다르면 빈 저장본 */
export function 저장본모양(값: unknown): 저장본 {
  const 빈것: 저장본 = { 판: 1, 항목: [] };
  if (typeof 값 !== 'object' || 값 === null) return 빈것;
  const v = 값 as { 판?: unknown; 항목?: unknown };
  if (v.판 !== 1 || !Array.isArray(v.항목)) return 빈것;
  const 글 = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length < 2_000;
  const 항목 = v.항목.filter((x): x is 저장항목 => {
    if (typeof x !== 'object' || x === null) return false;
    const h = x as Record<string, unknown>;
    return (
      글(h.키) && (h.상태 === '로그아웃' || h.상태 === '로그인') && 글(h.틀) && 글(h.주소) && 글(h.지문) && 글(h.글자지문) &&
      typeof h.기록 === 'string' && 기록이름꼴.test(h.기록) && typeof h.훑은날 === 'string' && 날꼴.test(h.훑은날)
    );
  });
  return { 판: 1, 항목 };
}

/** 저장 폴더 안 기록 이름 — 상태 + 틀로 정해 실행마다 같다. 영문 소문자 · 숫자만 */
export function 저장이름(상태: 상태, 틀: string): string {
  return `${상태 === '로그인' ? 'in' : 'out'}-${createHash('sha1').update(`${상태} ${틀}`).digest('hex').slice(0, 12)}.md`;
}

/** 기록 첫 줄 `# <크롤 주소>` — 이름이 아니라 이것으로 목록과 맞춘다(이어하기에서 크롤 번호가 바뀌어도 안 섞인다) */
export function 기록주소(글: string): string | null {
  const 첫줄 = 글.split('\n', 1)[0] ?? '';
  const m = /^#\s+(https?:\/\/\S+)\s*$/.exec(첫줄);
  return m === null ? null : m[1]!;
}

const 날수 = (앞: string, 뒤: string): number => Math.round((Date.parse(뒤) - Date.parse(앞)) / 86_400_000);

/** 이번 크롤 목록을 저장본과 견준다 — 글자 지문까지 같고 30일 안이면 같음(저장 기록을 그대로 쓴다) */
export function 견주기(
  목록: 목록칸[],
  저장: 저장본,
  오늘: string,
  한도 = 다시훑는날수,
): { 표시: Map<string, { 저장본: '같음' | '바뀜' | '새 화면'; 저장기록?: string }>; 못본: 저장항목[]; 가장오래된: number | null } {
  const 저장키 = new Map(저장.항목.map((x) => [x.키, x]));
  const 본키 = new Set<string>();
  const 표시 = new Map<string, { 저장본: '같음' | '바뀜' | '새 화면'; 저장기록?: string }>();
  let 가장오래된: number | null = null;
  for (const x of 목록) {
    const 키 = `${x.상태} ${x.틀}`;
    본키.add(키);
    const 옛 = 저장키.get(키);
    if (옛 === undefined) {
      표시.set(x.주소, { 저장본: '새 화면' });
      continue;
    }
    const 지난 = 날수(옛.훑은날, 오늘);
    if (옛.글자지문 === x.글자지문 && 지난 <= 한도) {
      표시.set(x.주소, { 저장본: '같음', 저장기록: 옛.기록 });
      가장오래된 = Math.max(가장오래된 ?? 0, 지난);
    } else {
      표시.set(x.주소, { 저장본: '바뀜' });
    }
  }
  const 못본 = 저장.항목.filter((x) => !본키.has(x.키));
  return { 표시, 못본, 가장오래된 };
}

/** 이번에 쓴 화면 기록을 목록과 맞춰 저장할 항목으로 — 첫 줄 주소가 목록에 없는 기록(더 갈 곳 · 손 목록)은 저장하지 않는다 */
export function 이번것들(목록: 목록칸[], 기록들: { 이름: string; 글: string }[], 오늘: string): (저장항목 & { 원본: string })[] {
  const 주소로 = new Map(목록.map((x) => [x.주소, x]));
  const 고른: (저장항목 & { 원본: string })[] = [];
  for (const r of 기록들) {
    const 주소 = 기록주소(r.글);
    const x = 주소 === null ? undefined : 주소로.get(주소);
    if (x === undefined) continue;
    고른.push({ 키: `${x.상태} ${x.틀}`, 상태: x.상태, 틀: x.틀, 주소: x.주소, 지문: x.지문, 글자지문: x.글자지문, 기록: 저장이름(x.상태, x.틀), 훑은날: 오늘, 원본: r.이름 });
  }
  return 고른;
}

/** 저장본을 간다 — 이번에 본 화면만 바꾸고 나머지는 남긴다. 지우기(화면만 · 다 봄)면 이번에 본 것만 남긴다 */
export function 갈기(저장: 저장본, 이번: 저장항목[], 지우기: boolean): 저장본 {
  const 새것 = new Map(이번.map(({ 키, 상태, 틀, 주소, 지문, 글자지문, 기록, 훑은날 }) => [키, { 키, 상태, 틀, 주소, 지문, 글자지문, 기록, 훑은날 }]));
  if (지우기) return { 판: 1, 항목: [...새것.values()] };
  const 옛키 = new Set(저장.항목.map((x) => x.키));
  return { 판: 1, 항목: [...저장.항목.map((x) => 새것.get(x.키) ?? x), ...[...새것.values()].filter((x) => !옛키.has(x.키))] };
}
