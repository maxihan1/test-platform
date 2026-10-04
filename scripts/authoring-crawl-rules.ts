// 화면 크롤러의 판정 — 따라갈 주소 · 같은 틀 · 지문 · 목록 · 로그인 풀림. 껍데기(authoring-crawl.ts)는 I/O 만 한다 (도메인/작성 §3.6 「★ 역방향」)
import { createHash } from 'node:crypto';

const 내려받기 = /\.(pdf|zip|7z|rar|hwpx?|docx?|xlsx?|pptx?|csv|txt|png|jpe?g|gif|svg|webp|ico|mp4|mov|avi|mp3|wav|apk|exe|dmg|msi)$/i;
// 링크 글자 — 주소가 멀쩡해 보여도 이것이면 상태가 바뀐다(검토 BLOCKER — `/member/out.php` 가 「로그아웃」이었다)
const 위험글자 = /로그아웃|탈퇴|삭제|담기|결제|구매하기|주문하기|신청하기|logout|log\s?out|sign\s?out|delete|remove|unsubscribe|withdraw/i;
// 주소의 동작 낱말 — 낱말 경계로만 본다(`/address` · `/outline` 은 따라간다)
const 위험낱말 = /(?:^|[/_.\-?&=])(?:logout|logoff|signout|sign-out|log-out|out\.php|delete|del|remove|add|cancel|like|toggle|withdraw|unsubscribe|download|leave)(?=$|[/_.\-?&=])/i;
const 동작인자 = /[?&](?:action|act|cmd|mode|op)=/i;
// 같은 틀로 묶는 인자 — 쪽 번호 · 정렬 · 개수. 글자 값으로 화면을 가르는 인자(?modal= · ?bo_table=)는 묶지 않는다
const 쪽인자 = new Set(['page', 'p', 'pg', 'pageno', 'sort', 'order', 'orderby', 'sst', 'sod', 'size', 'limit', 'offset', 'per', 'perpage']);
const 숫자마디 = /^(?:\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{24,})$/i;

const 해시라우트 = (해시: string): boolean => 해시.startsWith('#/') || 해시.startsWith('#!');

/** 따라갈 절대 주소, 아니면 null. 링크 이동만으로 로그아웃 · 삭제 · 담기가 일어나는 곳을 거른다 */
export function 주소고르기(href: string, 글자: string, 기준: string): string | null {
  let u: URL;
  try {
    u = new URL(href, 기준);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (u.origin !== new URL(기준).origin) return null;
  if (!해시라우트(u.hash)) u.hash = '';
  if (내려받기.test(u.pathname)) return null;
  if (위험글자.test(글자)) return null;
  const 경로 = decodeURIComponent(u.pathname) + u.search + u.hash;
  if (위험낱말.test(경로) || 동작인자.test(u.search)) return null;
  return u.toString();
}

const 마디정리 = (경로: string): string =>
  경로
    .split('/')
    .map((m) => (숫자마디.test(m) ? ':n' : m))
    .join('/');

/** 같은 틀이면 같은 키 — 숫자 마디 · 숫자 값 · 쪽 인자만 묶는다 */
export function 틀키(주소: string): string {
  const u = new URL(주소);
  const 인자 = [...u.searchParams]
    .filter(([k]) => !쪽인자.has(k.toLowerCase()))
    .map(([k, v]) => `${k}=${/^\d+$/.test(v) ? ':n' : v}`)
    .sort();
  const 해시 = 해시라우트(u.hash) ? 마디정리(u.hash) : '';
  return `${마디정리(u.pathname)}${인자.length === 0 ? '' : `?${인자.join('&')}`}${해시}`;
}

/** 마지막 마디를 뺀 경로 — 숫자가 아닌 상세(슬러그)가 장수를 다 먹지 않게 부모마다 상한을 둔다 */
export function 부모키(주소: string): string {
  const u = new URL(주소);
  const 경로 = 해시라우트(u.hash) ? `${u.pathname}${u.hash}` : u.pathname;
  return 경로.replace(/\/[^/]*\/?$/, '') || '/';
}

/** 화면 구조의 지문 — 숫자만 다른 같은 구조(글 번호 · 날짜 · 개수)는 같은 값. 다음 실행이 바뀐 화면을 가를 때 쓴다 */
export function 지문(구조: string): string {
  const 정리 = 구조.replace(/\d+/g, '0').replace(/[ \t]+/g, ' ');
  return createHash('sha1').update(정리).digest('hex').slice(0, 12);
}

export interface 목록항목 {
  상태: '로그아웃' | '로그인';
  틀: string;
  주소: string;
  이름: string;
  파일: string;
  시작: boolean;
}

/** 훑을 목록 — 두 상태에 다 있는 틀은 로그인 하나, 시작 화면만 둘 다 (§3.6 「기획서가 없을 때」) */
export function 목록고르기(항목들: 목록항목[]): 목록항목[] {
  const 로그인틀 = new Set(항목들.filter((x) => x.상태 === '로그인').map((x) => x.틀));
  const 본 = new Set<string>();
  const 고른: 목록항목[] = [];
  for (const x of 항목들) {
    if (x.상태 === '로그아웃' && 로그인틀.has(x.틀) && !x.시작) continue;
    const 키 = `${x.상태} ${x.틀}`;
    if (본.has(키)) continue;
    본.add(키);
    고른.push(x);
  }
  return 고른;
}

const 로그인주소 = /log-?in|sign-?in|auth|로그인/i;

/** 로그인 판에서 로그인 화면으로 튕겼나 — 로그인 화면이 아닌 곳에서 비밀번호 칸이 나오거나 로그인 주소로 돌려보내졌다 */
export function 로그인풀렸나(x: { 요청: string; 최종: string; 비밀번호칸: boolean }): boolean {
  const 요청 = new URL(x.요청);
  const 최종 = new URL(x.최종);
  const 로그인화면 = (u: URL) => 로그인주소.test(decodeURIComponent(u.pathname));
  if (로그인화면(요청)) return false;
  return x.비밀번호칸 || 로그인화면(최종);
}
