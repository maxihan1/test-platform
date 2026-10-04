// 화면 크롤러 판정 검사 — 따라갈 주소 · 같은 틀 · 지문 · 목록 · 로그인 풀림 (도메인/작성 §3.6 「★ 역방향」 · 2026-10-04)
import { describe, expect, it } from 'vitest';

import { 로그인풀렸나, 목록고르기, 부모키, 주소고르기, 지문, 틀키 } from './authoring-crawl-rules.js';

const 기준 = 'https://site.test/main';

describe('주소고르기 — 링크 이동만으로 상태가 바뀌는 곳은 따라가지 않는다', () => {
  it('같은 출처 링크는 절대 주소로, # 은 뗀다', () => {
    expect(주소고르기('/about/intro#top', '소개', 기준)).toBe('https://site.test/about/intro');
  });

  it('다른 출처 · javascript · mailto · tel 은 버린다', () => {
    expect(주소고르기('https://other.test/a', '밖', 기준)).toBeNull();
    expect(주소고르기('javascript:void(0)', '열기', 기준)).toBeNull();
    expect(주소고르기('mailto:a@b.c', '메일', 기준)).toBeNull();
    expect(주소고르기('tel:010', '전화', 기준)).toBeNull();
  });

  it('해시 라우트(#/ · #!)는 화면으로 본다', () => {
    expect(주소고르기('#/products', '상품', 기준)).toBe('https://site.test/main#/products');
    expect(주소고르기('#!/cart', '장바구니', 기준)).toBe('https://site.test/main#!/cart');
  });

  it('내려받기 확장자는 버린다', () => {
    expect(주소고르기('/files/guide.pdf', '안내', 기준)).toBeNull();
    expect(주소고르기('/f/공고문.hwp', '공고문', 기준)).toBeNull();
  });

  it('링크 글자가 상태를 바꾸면 주소가 멀쩡해도 버린다 (검토 BLOCKER — /member/out.php 가 로그아웃이었다)', () => {
    expect(주소고르기('/member/out.php', '로그아웃', 기준)).toBeNull();
    expect(주소고르기('/my/leave', '회원탈퇴', 기준)).toBeNull();
    expect(주소고르기('/goods/9', '장바구니 담기', 기준)).toBeNull();
    expect(주소고르기('/x', 'Sign out', 기준)).toBeNull();
  });

  it('주소의 동작 낱말 · 동작 인자도 버린다', () => {
    for (const 주소 of ['/logout', '/auth/sign-out', '/cart/add?id=3', '/board/del/4', '/post/remove', '/order/cancel', '/like/7', '/a?act=del', '/a?action=save', '/download?id=1']) {
      expect(주소고르기(주소, '', 기준), 주소).toBeNull();
    }
  });

  it('동작 낱말이 다른 낱말의 일부면 따라간다', () => {
    expect(주소고르기('/address', '주소록', 기준)).toBe('https://site.test/address');
    expect(주소고르기('/about/outline', '개요', 기준)).toBe('https://site.test/about/outline');
  });
});

describe('틀키 — 숫자와 쪽 번호만 같은 틀로 묶는다 (검토 BLOCKER — ?modal= 로 화면을 가르는 사이트)', () => {
  it('숫자 마디 · 숫자 값만 다른 주소는 같은 틀', () => {
    expect(틀키('https://site.test/board/123')).toBe(틀키('https://site.test/board/456'));
    expect(틀키('https://site.test/my/orders/DM20261002-0001')).toBe(틀키('https://site.test/my/orders/DM20260924-0002'));
    expect(틀키('https://site.test/about/intro')).not.toBe(틀키('https://site.test/about/world'));
    expect(틀키('https://site.test/view?wr_id=3&bo_table=notice')).toBe(틀키('https://site.test/view?bo_table=notice&wr_id=9'));
  });

  it('쪽 번호 · 정렬 · 돌아갈 주소 인자는 빼고 묶는다', () => {
    expect(틀키('https://site.test/list?page=2&sort=new')).toBe(틀키('https://site.test/list'));
    expect(틀키('https://site.test/login?next=%2Fboard%2F9')).toBe(틀키('https://site.test/login'));
    expect(틀키('https://site.test/login?returnUrl=/my')).toBe(틀키('https://site.test/login'));
  });

  it('글자 값으로 화면을 가르는 인자는 다른 틀이다', () => {
    expect(틀키('https://site.test/?modal=login')).not.toBe(틀키('https://site.test/?modal=find-password'));
    expect(틀키('https://site.test/bbs?bo_table=notice')).not.toBe(틀키('https://site.test/bbs?bo_table=qna'));
  });

  it('해시 라우트도 경로로 본다', () => {
    expect(틀키('https://site.test/#/products/12')).toBe(틀키('https://site.test/#/products/34'));
    expect(틀키('https://site.test/#/products')).not.toBe(틀키('https://site.test/#/cart'));
  });
});

describe('부모키 — 숫자가 아닌 상세(슬러그)가 장수를 다 먹지 않게', () => {
  it('마지막 마디를 뺀 경로', () => {
    expect(부모키('https://site.test/product/blue-shirt')).toBe(부모키('https://site.test/product/red-hat'));
    expect(부모키('https://site.test/product/blue-shirt')).not.toBe(부모키('https://site.test/news/a'));
  });

  it('최상위 화면은 상한을 안 둔다(null) — 데모마켓 실측에서 /signup · /cart 가 9번째라 잘렸다', () => {
    expect(부모키('https://site.test/signup')).toBeNull();
    expect(부모키('https://site.test/')).toBeNull();
  });
});

describe('지문 — 숫자만 다른 같은 구조는 같은 값', () => {
  it('숫자를 지우고 겹 공백을 줄인다', () => {
    expect(지문('- heading "공지 12"\n- link "3"')).toBe(지문('- heading  "공지 99"\n- link "7"'));
    expect(지문('- heading "공지"')).not.toBe(지문('- heading "FAQ"'));
  });
});

describe('목록고르기 — 두 상태에 다 있으면 로그인 하나, 시작 화면만 둘 다', () => {
  const 항목 = (상태: '로그아웃' | '로그인', 틀: string, 시작 = false) => ({ 상태, 틀, 주소: `https://site.test${틀}`, 이름: 틀, 파일: `${상태}/${틀}.yml`, 시작 });

  it('고른다', () => {
    const 목록 = 목록고르기([항목('로그아웃', '/', true), 항목('로그인', '/', true), 항목('로그아웃', '/login'), 항목('로그아웃', '/about'), 항목('로그인', '/about'), 항목('로그인', '/my')]);
    expect(목록.map((x) => `${x.상태} ${x.틀}`)).toEqual(['로그아웃 /', '로그인 /', '로그아웃 /login', '로그인 /about', '로그인 /my']);
  });
});

describe('로그인풀렸나 — 로그인 판에서 로그인 화면으로 튕겼나', () => {
  it('로그인 화면이 아닌 곳을 열었는데 아이디 칸과 비밀번호 칸이 나오면 풀렸다', () => {
    expect(로그인풀렸나({ 요청: 'https://site.test/my', 최종: 'https://site.test/my', 비밀번호칸: true, 아이디칸: true })).toBe(true);
  });

  it('로그인 주소로 돌려보내졌으면 풀렸다', () => {
    expect(로그인풀렸나({ 요청: 'https://site.test/my', 최종: 'https://site.test/loginForm?next=/my', 비밀번호칸: false, 아이디칸: false })).toBe(true);
  });

  it('비밀번호 칸만 있는 본인 확인 화면은 아니다 — 데모마켓 /my/profile 을 풀림으로 잘못 보고 멈췄다', () => {
    expect(로그인풀렸나({ 요청: 'https://site.test/my/profile', 최종: 'https://site.test/my/profile', 비밀번호칸: true, 아이디칸: false })).toBe(false);
  });

  it('로그인 화면 자체를 열었거나 칸이 없으면 아니다', () => {
    expect(로그인풀렸나({ 요청: 'https://site.test/login', 최종: 'https://site.test/login', 비밀번호칸: true, 아이디칸: true })).toBe(false);
    expect(로그인풀렸나({ 요청: 'https://site.test/my', 최종: 'https://site.test/my', 비밀번호칸: false, 아이디칸: false })).toBe(false);
  });
});
