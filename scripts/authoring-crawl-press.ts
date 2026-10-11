// 크롤러가 무엇을 누를지 — 누를 후보 · 탈퇴 흐름 · 로그아웃 · 화면 안 확인 창 버튼 판정. 껍데기(authoring-crawl-page.ts)가 부른다 (도메인/작성 §3.6 「★ 표준 기획서」 「화면 기록과 크롤러」)
import { 걸러진까닭, 풀기 } from './authoring-crawl-rules.js';

export type 누름종류 = '버튼' | '링크';

/** 화면을 처음 연 상태에서 모은 누를 후보 하나 */
export interface 후보 {
  종류: 누름종류;
  이름: string;
  /** 링크의 href 글자 그대로. 버튼은 null */
  href: string | null;
  /** 보이고 막히지 않았다 */
  보임: boolean;
  /** 머리 · 바닥 · 메뉴 안 — 화면마다 같은 것이라 사이트 전체에서 한 번만 누른다 */
  머리바닥: boolean;
  /** 입력칸이 있는 폼의 제출 버튼 — 입력칸은 채우지 않으므로 누르지 않는다 */
  제출막힘: boolean;
}

// 탈퇴 흐름 — 그 안에서는 아무것도 누르지 않는다. 「해지」만은 구독 해지일 수 있어 계정 · 회원이 붙을 때만 본다
const 탈퇴말 = /탈퇴|withdraw|unregister|deactivate|(?:계정|회원)\s*(?:삭제|해지|닫기)|(?:delete|close)\s*(?:my\s*)?account/i;
const 탈퇴경로 = /(?:^|[/_.\-?&=])(?:withdraw\w*|leave|unregister|secession|deactivate|resign)(?=$|[/_.\-?&=])/i;
const 로그아웃말 = /로그아웃|로그오프|log\s?-?out|log\s?-?off|sign\s?-?out/i;
// 그누보드 로그아웃은 `/bbs/logout.php` 말고 `/member/out.php` 꼴도 있다
const 로그아웃파일 = /(?:^|[/_.\-])out\.php$/i;
const 그만말 = /취소|닫기|아니[오요]|cancel|close|dismiss|^no$|^[×x✕]$/i;

export const 탈퇴말인가 = (글: string): boolean => 탈퇴말.test(글);

/** 주소가 탈퇴 흐름인가 — 경로 · 인자 · 해시 라우트의 낱말(`/my/withdraw` · `member_leave.php` · `/탈퇴`) */
export function 탈퇴주소인가(주소: string, 기준?: string): boolean {
  try {
    const u = new URL(주소, 기준);
    const 글 = 풀기(u.pathname + u.search + u.hash);
    return 탈퇴경로.test(글) || 탈퇴말.test(글);
  } catch {
    return false;
  }
}

/** 로그아웃을 하는 것인가 — 이름이나 주소로 본다 */
export function 로그아웃인가(이름: string, href: string | null, 기준: string): boolean {
  if (로그아웃말.test(이름)) return true;
  if (href === null) return false;
  try {
    const 경로 = 풀기(new URL(href, 기준).pathname);
    return 로그아웃말.test(경로) || 로그아웃파일.test(경로);
  } catch {
    return false;
  }
}

/**
 * 누를까 — 버튼은 위험 이름도 누르고, 링크는 따라가지 않는 것(위험 글자 · 동작 낱말 · `javascript:` · `#`)만 누른다. 따라가는 링크는 이동으로 이미 본다.
 * 탈퇴 흐름 화면에서는 아무것도 안 누른다. 로그아웃은 로그인 판에서 다시 로그인할 수 있을 때만 누른다
 */
export function 누를까(x: 후보, 상황: { 상태: '로그아웃' | '로그인'; 탈퇴흐름: boolean; 다시로그인: boolean }, 기준: string): boolean {
  if (상황.탈퇴흐름 || !x.보임 || x.제출막힘) return false;
  if (로그아웃인가(x.이름, x.href, 기준)) return 상황.상태 === '로그인' && 상황.다시로그인;
  if (x.종류 === '버튼') return true;
  const h = (x.href ?? '').trim();
  if (h === '' || h === '#' || /^javascript:/i.test(h)) return true;
  const 까닭 = 걸러진까닭(h, x.이름, 기준);
  return 까닭 === '위험 글자' || 까닭 === '동작 낱말';
}

/** 같은 것을 두 번 누르지 않는 키 — 머리 · 바닥은 사이트 전체에서, 나머지는 같은 틀 안에서 이름이 같으면 하나다(목록 줄마다의 「삭제」) */
export const 누름키 = (x: Pick<후보, '종류' | '이름' | '머리바닥'>, 틀: string): string => `${x.종류} ${x.머리바닥 ? '*' : 틀} ${x.이름.trim()}`;

/** 화면 안 확인 창에서 누를 버튼 — 취소 · 닫기가 아닌 것 가운데 마지막(확인 버튼이 오른쪽 끝에 오는 관례). 없으면 null */
export function 확인버튼고르기(이름들: readonly string[]): number | null {
  for (let i = 이름들.length - 1; i >= 0; i--) {
    const 이름 = 이름들[i]!.trim();
    if (이름 !== '' && !그만말.test(이름)) return i;
  }
  return null;
}

/** 화면 연결의 「무엇을 눌러」 칸 */
export const 연결이름 = (종류: 누름종류, 이름: string): string => `${종류} 「${이름.trim().slice(0, 60) || '이름 없음'}」`;
