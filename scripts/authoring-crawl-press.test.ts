// 크롤러 누르기 판정 검사 — 누를 후보 · 탈퇴 흐름 · 로그아웃 · 확인 창 버튼 (도메인/작성 §3.6 「★ 표준 기획서」 · PRD-F6-02)
import { describe, expect, it } from 'vitest';

import { type 후보, 누를까, 누름키, 로그아웃인가, 연결이름, 확인버튼고르기, 탈퇴말인가, 탈퇴주소인가 } from './authoring-crawl-press.js';

const 기준 = 'https://site.test/goods/3';
const 로그인판 = { 상태: '로그인' as const, 탈퇴흐름: false, 다시로그인: true };
const 버튼 = (이름: string, 더: Partial<후보> = {}): 후보 => ({ 종류: '버튼', 이름, href: null, 보임: true, 머리바닥: false, 제출막힘: false, ...더 });
const 링크 = (이름: string, href: string, 더: Partial<후보> = {}): 후보 => ({ 종류: '링크', 이름, href, 보임: true, 머리바닥: false, 제출막힘: false, ...더 });

describe('누를까 — 버튼은 위험 이름도 누르고 폼 제출은 안 누른다', () => {
  it('삭제 · 결제 · 담기 버튼도 누른다', () => {
    for (const 이름 of ['삭제', '결제하기', '장바구니 담기', '더 보기', '']) expect(누를까(버튼(이름), 로그인판, 기준), 이름).toBe(true);
  });

  it('입력칸이 있는 폼의 제출 버튼 · 안 보이거나 막힌 것은 안 누른다', () => {
    expect(누를까(버튼('검색', { 제출막힘: true }), 로그인판, 기준)).toBe(false);
    expect(누를까(버튼('열기', { 보임: false }), 로그인판, 기준)).toBe(false);
  });

  it('탈퇴 흐름 화면에서는 아무것도 안 누른다', () => {
    expect(누를까(버튼('확인'), { ...로그인판, 탈퇴흐름: true }, 기준)).toBe(false);
    expect(누를까(링크('취소', '/'), { ...로그인판, 탈퇴흐름: true }, 기준)).toBe(false);
  });

  it('링크는 따라가지 않는 것만 누른다 — 위험 글자 · 동작 낱말 · javascript · #', () => {
    expect(누를까(링크('회원탈퇴', '/my/leave'), 로그인판, 기준)).toBe(true);
    expect(누를까(링크('', '/cart/add?id=3'), 로그인판, 기준)).toBe(true);
    expect(누를까(링크('열기', 'javascript:void(0)'), 로그인판, 기준)).toBe(true);
    expect(누를까(링크('메뉴', '#'), 로그인판, 기준)).toBe(true);
    expect(누를까(링크('공지', '/notice'), 로그인판, 기준)).toBe(false);
    expect(누를까(링크('안내서', '/files/guide.pdf'), 로그인판, 기준)).toBe(false);
    expect(누를까(링크('삭제', 'https://other.test/del'), 로그인판, 기준)).toBe(false);
  });

  it('로그아웃은 로그인 판에서 다시 로그인할 수 있을 때만 누른다', () => {
    expect(누를까(버튼('로그아웃'), 로그인판, 기준)).toBe(true);
    expect(누를까(링크('', '/member/out.php'), 로그인판, 기준)).toBe(true);
    expect(누를까(버튼('로그아웃'), { ...로그인판, 다시로그인: false }, 기준)).toBe(false);
    expect(누를까(버튼('Sign out'), { ...로그인판, 상태: '로그아웃' }, 기준)).toBe(false);
  });
});

describe('로그아웃인가 — 이름이나 주소로 본다', () => {
  it('이름 · 주소 꼴', () => {
    expect(로그아웃인가('로그아웃', null, 기준)).toBe(true);
    expect(로그아웃인가('Log out', null, 기준)).toBe(true);
    expect(로그아웃인가('', '/bbs/logout.php', 기준)).toBe(true);
    expect(로그아웃인가('', '/actionLogout.do', 기준)).toBe(true);
    expect(로그아웃인가('', '/member/out.php', 기준)).toBe(true);
  });

  it('비슷한 낱말은 아니다', () => {
    expect(로그아웃인가('품절 상품', '/goods/outlet', 기준)).toBe(false);
    expect(로그아웃인가('로그인', '/about.php', 기준)).toBe(false);
  });
});

describe('탈퇴 흐름 — 주소 · 제목 · 이름 · 확인 창 글의 낱말', () => {
  it('주소의 탈퇴 낱말은 마디 경계로 본다', () => {
    for (const 주소 of ['https://site.test/my/withdraw', 'https://site.test/bbs/member_leave.php', 'https://site.test/%ED%83%88%ED%87%B4', 'https://site.test/#/account/deactivate']) {
      expect(탈퇴주소인가(주소), 주소).toBe(true);
    }
    expect(탈퇴주소인가('https://site.test/leaves/autumn')).toBe(false);
    expect(탈퇴주소인가('https://site.test/my/orders')).toBe(false);
  });

  it('글의 탈퇴 낱말 — 해지는 계정 · 회원이 붙을 때만', () => {
    expect(탈퇴말인가('회원 탈퇴')).toBe(true);
    expect(탈퇴말인가('정말 탈퇴하시겠습니까?')).toBe(true);
    expect(탈퇴말인가('Delete my account')).toBe(true);
    expect(탈퇴말인가('회원 해지')).toBe(true);
    expect(탈퇴말인가('구독 해지')).toBe(false);
    expect(탈퇴말인가('주문 취소')).toBe(false);
  });
});

describe('누름키 — 같은 것을 두 번 누르지 않는다', () => {
  it('머리 · 바닥은 사이트 전체에서 하나, 나머지는 같은 틀 안에서 하나', () => {
    expect(누름키(버튼('검색', { 머리바닥: true }), '/a')).toBe(누름키(버튼('검색', { 머리바닥: true }), '/b'));
    expect(누름키(버튼('삭제'), '/cart')).toBe(누름키(버튼(' 삭제 '), '/cart'));
    expect(누름키(버튼('삭제'), '/cart')).not.toBe(누름키(버튼('삭제'), '/board/:n'));
    expect(누름키(버튼('삭제'), '/cart')).not.toBe(누름키(링크('삭제', '#'), '/cart'));
  });
});

describe('확인버튼고르기 — 화면 안 확인 창에서 누를 버튼', () => {
  it('취소 · 닫기가 아닌 것 가운데 마지막 — 데모마켓 확인 창은 [×][취소][확인]', () => {
    expect(확인버튼고르기(['×', '취소', '확인'])).toBe(2);
    expect(확인버튼고르기(['삭제', '닫기'])).toBe(0);
    expect(확인버튼고르기(['Cancel', 'OK'])).toBe(1);
  });

  it('누를 것이 없으면 null', () => {
    expect(확인버튼고르기(['닫기', '취소'])).toBeNull();
    expect(확인버튼고르기(['', 'No'])).toBeNull();
    expect(확인버튼고르기([])).toBeNull();
  });
});

describe('연결이름 — 무엇을 눌러 갔나', () => {
  it('종류와 이름, 비었으면 이름 없음', () => {
    expect(연결이름('버튼', ' 장바구니 담기 ')).toBe('버튼 「장바구니 담기」');
    expect(연결이름('링크', '')).toBe('링크 「이름 없음」');
    expect(연결이름('링크', 'ㄱ'.repeat(80))).toBe(`링크 「${'ㄱ'.repeat(60)}」`);
  });
});
