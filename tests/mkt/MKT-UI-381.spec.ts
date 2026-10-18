import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 로그아웃요청, 로그인요청 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 나타났나 } from './helpers/visual.helper.js';
import { 이동한화면, 홈화면 } from './pages/home.page.js';
import { 로그인화면 } from './pages/login.page.js';
import { 회원가입화면 } from './pages/signup.page.js';
import { 개인정보처리방침화면, 이용약관화면 } from './pages/terms.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-381',
  name: '공통 버튼 반응 — 메뉴와 링크',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 이동 = new 이동한화면(page);
  const 로그인 = new 로그인화면(page);
  const 가입 = new 회원가입화면(page);
  const 이용약관 = new 이용약관화면(page);
  const 개인정보 = new 개인정보처리방침화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 방해창막기(page);
    await 홈.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 홈.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('홈 화면 머리글 · 바닥글에서 「데모마켓」을 누른다', async () => {
    await 홈.머리글.그려질때까지();
    await 홈.머리글.로고.click();
    await verify('홈 화면 머리글 · 바닥글에서 「데모마켓」을 누르면 홈 화면이 보인다', await 나타났나(홈.제목, 10000), true);
    await 홈.머리글바닥글만열기();
  });

  await test.step('홈 화면 머리글 · 바닥글에서 「커뮤니티」를 누른다', async () => {
    await 홈.머리글.메뉴누르기('커뮤니티');
    await verify('홈 화면 머리글 · 바닥글에서 「커뮤니티」를 누르면 게시판 목록 화면이 보인다', await 나타났나(이동.게시판목록제목, 10000), true);
    await 홈.머리글바닥글만열기();
  });

  await test.step('홈 화면 머리글 · 바닥글에서 「쇼핑」을 누른다', async () => {
    await 홈.머리글.메뉴누르기('쇼핑');
    await verify('홈 화면 머리글 · 바닥글에서 「쇼핑」을 누르면 상품 목록 화면이 보인다', await 나타났나(이동.상품목록제목, 10000), true);
    await 홈.머리글바닥글만열기();
  });

  await test.step('홈 화면 머리글 · 바닥글에서 「고객센터」를 누른다', async () => {
    await 홈.머리글.메뉴누르기('고객센터');
    await verify('홈 화면 머리글 · 바닥글에서 「고객센터」를 누르면 고객센터 화면이 보인다', await 나타났나(이동.고객센터제목, 10000), true);
    await 홈.머리글바닥글만열기();
  });

  await test.step('홈 화면 머리글 · 바닥글에서 「로그인」을 누른다', async () => {
    await 홈.머리글.그려질때까지();
    await 홈.머리글.로그인링크.click();
    await verify('홈 화면 머리글 · 바닥글에서 「로그인」을 누르면 로그인 화면이 보인다', await 나타났나(로그인.제목, 10000), true);
    await 홈.머리글바닥글만열기();
  });

  await test.step('홈 화면 머리글 · 바닥글에서 「회원가입」을 누른다', async () => {
    await 홈.머리글.그려질때까지();
    await 홈.머리글.회원가입링크.click();
    await verify('홈 화면 머리글 · 바닥글에서 「회원가입」을 누르면 회원가입 화면이 보인다', await 나타났나(가입.제목, 10000), true);
    await 홈.머리글바닥글만열기();
  });

  await test.step('홈 화면 머리글 · 바닥글에서 「이용약관」을 누른다', async () => {
    await 홈.바닥글.그려질때까지();
    await 홈.바닥글.이용약관링크.click();
    await verify('홈 화면 머리글 · 바닥글에서 「이용약관」을 누르면 이용약관 화면이 보인다', await 나타났나(이용약관.제목, 10000), true);
    await 홈.머리글바닥글만열기();
  });

  await test.step('홈 화면 머리글 · 바닥글에서 「개인정보처리방침」을 누른다', async () => {
    await 홈.바닥글.그려질때까지();
    await 홈.바닥글.개인정보링크.click();
    await verify('홈 화면 머리글 · 바닥글에서 「개인정보처리방침」을 누르면 개인정보처리방침 화면이 보인다', await 나타났나(개인정보.제목, 10000), true);
    await 홈.머리글바닥글만열기();
  });

  await test.step('홈 화면 머리글 · 바닥글에서 「마이페이지」를 누른다', async () => {
    const 상태 = await 로그인요청(page.request, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로그인 응답 코드가 200 이다', 상태, 200, { blocker: true });
    try {
      await 홈.머리글바닥글만열기();
      await 홈.머리글.로그인꼴일때까지();
      await verify('머리글에 「로그아웃」이 보인다', await 홈.머리글.로그아웃버튼.isVisible(), true, { blocker: true });
      await 홈.머리글.그려질때까지();
      await 홈.머리글.마이페이지링크.click();
      await verify('홈 화면 머리글 · 바닥글에서 「마이페이지」를 누르면 주문 내역 화면이 보인다', await 나타났나(이동.주문내역제목, 10000), true);
    } finally {
      await 로그아웃요청(page.request);
    }
    await 홈.머리글바닥글만열기();
  });

  await test.step('홈 화면 머리글 · 바닥글에서 「장바구니」를 누른다', async () => {
    await 홈.머리글.링크누르기(홈.머리글.장바구니링크);
    await verify('홈 화면 머리글 · 바닥글에서 「장바구니」를 누르면 비회원은 로그인 화면이 보인다', await 나타났나(로그인.제목, 10000), true);
  });
});
