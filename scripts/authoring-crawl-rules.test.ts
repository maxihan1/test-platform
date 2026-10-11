// 화면 크롤러 판정 검사 — 따라갈 주소 · 같은 틀 · 지문 · 목록 · 로그인 풀림 (도메인/작성 §3.6 「★ 역방향」 · 2026-10-04)
import { describe, expect, it } from 'vitest';

import { 걸러진까닭, 글자지문, 둘째장볼까, 로그인풀렸나, 목록고르기, 부모키, 빼는주소인가, 뺄경로읽기, 연결모으기, 주소고르기, 지문, 틀키 } from './authoring-crawl-rules.js';

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

  it('운영 데이터를 바꾸는 게시판 · 쇼핑몰 · 전자정부 꼴도 버린다 (검사 BLOCKER — 그누보드 추천 · 영카트 찜 · actionLogout.do)', () => {
    for (const 주소 of ['/bbs/good.php?bo_table=free&wr_id=3&good=good', '/shop/wishupdate.php?it_id=9', '/logoutProc.do', '/actionLogout.do', '/bbs/delete.php?w=d&wr_id=1', '/bbs/board.php?w=d&wr_id=1']) {
      expect(주소고르기(주소, '', 기준), 주소).toBeNull();
    }
    for (const 글자 of ['추천', '로그오프', '구독 해지', '좋아요']) expect(주소고르기('/x', 글자, 기준), 글자).toBeNull();
  });

  it('위험 글자는 짧은 버튼 글자에만 — 글 제목에 「추천」이 든 게시글은 따라간다 (데모마켓 실측)', () => {
    expect(주소고르기('/board/9', '가을 산책 코스 추천 1', 기준)).toBe('https://site.test/board/9');
  });

  it('보기 · 목록 동작 인자는 따라간다 — XE · 게시판', () => {
    expect(주소고르기('/?act=dispMemberLoginForm', '로그인', 기준)).toBe('https://site.test/?act=dispMemberLoginForm');
    expect(주소고르기('/bbs?mode=list', '목록', 기준)).toBe('https://site.test/bbs?mode=list');
  });

  it('EUC-KR 처럼 풀 수 없는 경로에서도 죽지 않는다', () => {
    expect(주소고르기('/%C7%D1%B1%DB', '한글', 기준)).toBe('https://site.test/%C7%D1%B1%DB');
  });

  it('왜 버렸는지 돌려준다 — 걸러진 수를 요약에 싣는다', () => {
    expect(걸러진까닭('/member/out.php', '로그아웃', 기준)).toBe('위험 글자');
    expect(걸러진까닭('/cart/add?id=3', '', 기준)).toBe('동작 낱말');
    expect(걸러진까닭('https://other.test/', '', 기준)).toBeNull();
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
    expect(틀키('https://site.test/policy/privacy-2024')).not.toBe(틀키('https://site.test/policy/terms-2025'));
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

describe('둘째장볼까 — 숫자 값 인자로 화면을 가르는 틀만 둘째 장을 견준다', () => {
  it('인자 숫자 값이면 본다, 경로 숫자(글 상세)면 안 본다', () => {
    expect(둘째장볼까(틀키('https://site.test/bbs?board_no=1'))).toBe(true);
    expect(둘째장볼까(틀키('https://site.test/board/12'))).toBe(false);
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

describe('지문 — 구조만 본다(글자 · 숫자는 뺀다)', () => {
  it('글 제목 · 숫자만 다른 같은 구조는 같은 값 — 게시판 글 둘', () => {
    expect(지문('- heading "가을 산책" [level=1]\n- link "3"')).toBe(지문('- heading  "겨울 등산" [level=1]\n- link "7"'));
  });

  it('요소가 다르면 다른 값 — ?tab=1 과 ?tab=2', () => {
    expect(지문('- heading "공지"\n- list')).not.toBe(지문('- heading "공지"\n- textbox "검색"'));
  });
});

describe('글자지문 — 크롤 파일 전체 · 숫자만 0 (2026-10-04 · 저장 기록을 그대로 쓸지 가른다)', () => {
  it('본문 숫자만 다르면 같고, 글자 · 입력칸 머리(숫자 포함)가 다르면 다르다', () => {
    expect(글자지문('# 입력칸: text 아이디 · 최대 20자\n- heading "공지 12"')).toBe(글자지문('# 입력칸: text 아이디 · 최대 20자\n- heading "공지 99"'));
    expect(글자지문('# 입력칸: text 아이디 · 최대 20자\n- x')).not.toBe(글자지문('# 입력칸: text 아이디 · 최대 30자\n- x'));
    expect(글자지문('- heading "공지"')).not.toBe(글자지문('- heading "FAQ"'));
    expect(글자지문('# 입력칸: text 아이디 · 필수\n- x')).not.toBe(글자지문('# 입력칸: text 아이디\n- x'));
  });
});

describe('목록고르기 — 두 상태에 다 있으면 로그인 하나, 시작 화면만 둘 다', () => {
  const 항목 = (상태: '로그아웃' | '로그인', 틀: string, 시작 = false) => ({ 상태, 틀, 주소: `https://site.test${틀}`, 이름: 틀, 파일: `${상태}/${틀}.yml`, 시작 });

  it('고른다', () => {
    const 목록 = 목록고르기([항목('로그아웃', '/', true), 항목('로그인', '/', true), 항목('로그아웃', '/login'), 항목('로그아웃', '/about'), 항목('로그인', '/about'), 항목('로그인', '/my')]);
    expect(목록.map((x) => `${x.상태} ${x.틀}`)).toEqual(['로그아웃 /', '로그인 /', '로그아웃 /login', '로그인 /about', '로그인 /my']);
  });
});

describe('연결모으기 — 화면 연결을 목록에 남은 화면으로 (PRD-F6-02)', () => {
  it('두 상태에 다 있는 틀은 로그인 하나만 남으므로 로그아웃 때 본 연결도 그 화면에 합친다 — 홈 → 로그인 · 가입', () => {
    const 로그아웃홈 = { 상태: '로그아웃' as const, 틀: '/' };
    const 로그인홈 = { 상태: '로그인' as const, 틀: '/' };
    const 로그아웃가입 = { 상태: '로그아웃' as const, 틀: '/join' };
    const 연결 = new Map([
      [0, new Map([['/login 링크', { to: '/login', via: '링크 「로그인」' }], ['/cart 링크', { to: '/cart', via: '링크 「장바구니」' }]])],
      [1, new Map([['/cart 링크', { to: '/cart', via: '링크 「장바구니」' }], ['/my 링크', { to: '/my', via: '링크 「내 정보」' }]])],
      [2, new Map([['/ 링크', { to: '/', via: '링크 「홈」' }]])],
    ]);
    expect(연결모으기([로그아웃홈, 로그인홈, 로그아웃가입], 연결, [로그인홈, 로그아웃가입])).toEqual([
      { 상태: '로그인', 틀: '/', 연결: [{ to: '/login', via: '링크 「로그인」' }, { to: '/cart', via: '링크 「장바구니」' }, { to: '/my', via: '링크 「내 정보」' }] },
      { 상태: '로그아웃', 틀: '/join', 연결: [{ to: '/', via: '링크 「홈」' }] },
    ]);
  });

  it('목록에 같은 틀이 없는 화면(로그인 풀림으로 빠진 것)의 연결은 버린다', () => {
    const 풀림 = { 상태: '로그인' as const, 틀: '/my/edit' };
    expect(연결모으기([풀림], new Map([[0, new Map([['/ 링크', { to: '/', via: '링크 「홈」' }]])]]), [])).toEqual([]);
  });
});

describe('로그인풀렸나 — 로그인 판에서 로그인 화면으로 튕겼나', () => {
  it('로그인 화면이 아닌 곳을 열었는데 아이디 칸과 비밀번호 칸이 나오면 풀렸다', () => {
    expect(로그인풀렸나({ 요청: 'https://site.test/my', 최종: 'https://site.test/my', 비밀번호칸: true, 아이디칸: true })).toBe(true);
  });

  it('로그인 주소로 돌려보내졌으면 풀렸다', () => {
    expect(로그인풀렸나({ 요청: 'https://site.test/my', 최종: 'https://site.test/loginForm?next=/my', 비밀번호칸: false, 아이디칸: false })).toBe(true);
  });

  it('auth 는 낱말로만 본다 — /authors 를 로그인 화면으로 보지 않는다', () => {
    expect(로그인풀렸나({ 요청: 'https://site.test/my', 최종: 'https://site.test/authors', 비밀번호칸: false, 아이디칸: false })).toBe(false);
    expect(로그인풀렸나({ 요청: 'https://site.test/my', 최종: 'https://site.test/auth/login', 비밀번호칸: false, 아이디칸: false })).toBe(true);
  });

  it('비밀번호 칸만 있는 본인 확인 화면은 아니다 — 데모마켓 /my/profile 을 풀림으로 잘못 보고 멈췄다', () => {
    expect(로그인풀렸나({ 요청: 'https://site.test/my/profile', 최종: 'https://site.test/my/profile', 비밀번호칸: true, 아이디칸: false })).toBe(false);
  });

  it('로그인 화면 자체를 열었거나 칸이 없으면 아니다', () => {
    expect(로그인풀렸나({ 요청: 'https://site.test/login', 최종: 'https://site.test/login', 비밀번호칸: true, 아이디칸: true })).toBe(false);
    expect(로그인풀렸나({ 요청: 'https://site.test/my', 최종: 'https://site.test/my', 비밀번호칸: false, 아이디칸: false })).toBe(false);
  });
});

describe('빼는주소인가 — 서비스 설정의 훑지 않을 경로 아래 주소는 열지 않는다 (#153)', () => {
  const 뺄 = ['/daejeon', '/gyeongnam'];

  it('마디 경계로 본다 — /daejeon 은 그 자체와 그 아래를 빼고 /daejeonx 는 안 뺀다', () => {
    expect(빼는주소인가('https://s.test/daejeon', 뺄)).toBe(true);
    expect(빼는주소인가('https://s.test/daejeon/about?x=1', 뺄)).toBe(true);
    expect(빼는주소인가('https://s.test/gyeongnam/notice/3', 뺄)).toBe(true);
    expect(빼는주소인가('https://s.test/daejeonx', 뺄)).toBe(false);
    expect(빼는주소인가('https://s.test/pwd/PwdSch', 뺄)).toBe(false);
  });

  it('인코딩은 풀어서 견준다', () => {
    expect(빼는주소인가('https://s.test/%EB%8C%80%EC%A0%84/a', ['/대전'])).toBe(true);
  });

  it('해시 라우트(#/…) 안 화면은 경로로 못 뺀다', () => {
    expect(빼는주소인가('https://s.test/#/daejeon/about', 뺄)).toBe(false);
  });

  it('목록이 비었거나 주소가 틀리면 빼지 않는다', () => {
    expect(빼는주소인가('https://s.test/daejeon', [])).toBe(false);
    expect(빼는주소인가('주소 아님', 뺄)).toBe(false);
  });
});

describe('뺄경로읽기 — --exclude 를 여러 번 받아 설정과 같은 값 규칙으로 거른다 (#153)', () => {
  it('여러 번 받고 끝의 / 를 걷고 같은 것은 하나로', () => {
    expect(뺄경로읽기(['https://s.test', '--exclude', '/daejeon/', '--out', '/o', '--exclude', '/gyeongnam', '--exclude', '/daejeon'])).toEqual([
      '/daejeon',
      '/gyeongnam',
    ]);
  });

  it('없으면 빈 목록', () => {
    expect(뺄경로읽기(['https://s.test', '--out', '/o', '--follow'])).toEqual([]);
  });

  it('틀린 값은 까닭 글 — / 로 시작하지 않거나 셸 글자가 섞였다', () => {
    expect(뺄경로읽기(['--exclude', 'daejeon'])).toMatch(/--exclude 값이 틀렸다.*daejeon/);
    expect(뺄경로읽기(['--exclude', "/a';rm"])).toMatch(/--exclude 값이 틀렸다/);
  });

  it('값 없이 끝났거나 다음 깃발이 오면 까닭 글', () => {
    expect(뺄경로읽기(['https://s.test', '--exclude'])).toMatch(/--exclude 뒤에 경로가 없다/);
    expect(뺄경로읽기(['--exclude', '--follow'])).toMatch(/--exclude 뒤에 경로가 없다/);
  });
});
