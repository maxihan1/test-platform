import { defineCase, test, verify } from '@platform/kit';

import { 상담창 } from './components/chat.component.js';
import { 바닥글 } from './components/footer.component.js';
import { 화면제목 } from './components/page-heading.component.js';
import { 일회용회원만들기, API로그인 } from './helpers/account.helper.js';
import { 새창묶음 } from './helpers/common-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-343',
  name: '공통 머리글에서 「커뮤니티」를 누르면 게시판 목록이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 제목 = new 화면제목(page);
  const 로그인 = new 로그인화면(page);
  const 바닥 = new 바닥글(page);
  const 상담 = new 상담창(page);
  await 안내창막기(page);

  await test.step('머리글 「커뮤니티」를 누른다', async () => {
    await 홈.머리만열기();
    await 홈.머리.메뉴누르기(홈.머리.커뮤니티);
    await 홈.머리.그려질때까지();
    await verify('공통 머리글에서 「커뮤니티」를 누르면 게시판 목록이 보인다', await 제목.글('커뮤니티').isVisible(), true);
  });

  await test.step('머리글 「쇼핑」을 누른다', async () => {
    await 홈.머리만열기();
    await 홈.머리.메뉴누르기(홈.머리.쇼핑);
    await 홈.머리.그려질때까지();
    await verify('공통 머리글에서 「쇼핑」을 누르면 상품 목록이 보인다', await 제목.글('쇼핑').isVisible(), true);
  });

  await test.step('머리글 「고객센터」를 누른다', async () => {
    await 홈.머리만열기();
    await 홈.머리.메뉴누르기(홈.머리.고객센터);
    await 홈.머리.그려질때까지();
    await verify('공통 머리글에서 「고객센터」를 누르면 고객센터 화면이 보인다', await 제목.글('고객센터').isVisible(), true);
  });

  await test.step('머리글 「로그인」을 누른다', async () => {
    await 홈.머리만열기();
    await 홈.머리.로그인.click();
    await 로그인.그려질때까지();
    await verify('공통 머리글에서 「로그인」을 누르면 로그인 화면이 보인다', await 제목.글('로그인').isVisible(), true);
  });

  await test.step('머리글 「회원가입」을 누른다', async () => {
    await 홈.머리만열기();
    await 홈.머리.회원가입.click();
    await 홈.머리.그려질때까지();
    await verify('공통 머리글에서 「회원가입」을 누르면 회원가입 화면이 보인다', await 제목.글('회원가입').isVisible(), true);
  });

  await test.step('머리글 장바구니 아이콘을 누른다', async () => {
    await 홈.머리만열기();
    await 홈.머리.장바구니.click();
    await 로그인.아이디.waitFor();
    await verify('공통 머리글에서 비회원이 장바구니 아이콘을 누르면 로그인 화면이 보인다', await 제목.글('로그인').isVisible(), true);
  });

  await test.step('머리글 「마이페이지」를 누른다', async () => {
    const 묶음 = await 새창묶음(page);
    try {
      const 회원쪽 = await 묶음.newPage();
      const 회원 = await 일회용회원만들기(묶음.request);
      await API로그인(묶음.request, 회원.loginId, 회원.password);
      await 안내창막기(회원쪽);
      const 회원홈 = new 홈화면(회원쪽);
      const 회원제목 = new 화면제목(회원쪽);
      await 회원홈.머리만열기();
      await 회원홈.머리.마이페이지.click();
      await 회원홈.머리.그려질때까지();
      await verify('공통 머리글에서 「마이페이지」를 누르면 주문 내역 화면이 보인다', await 회원제목.글('주문 내역').isVisible(), true);
    } finally {
      await 묶음.close();
    }
  });

  await test.step('바닥글 「이용약관」을 누른다', async () => {
    await 홈.머리만열기();
    await 바닥.이용약관.click();
    await 홈.머리.그려질때까지();
    await verify('공통 바닥글에서 「이용약관」을 누르면 이용약관 화면이 보인다', await 제목.글('이용약관').isVisible(), true);
  });

  await test.step('바닥글 「개인정보처리방침」을 누른다', async () => {
    await 홈.머리만열기();
    await 바닥.개인정보처리방침.click();
    await 홈.머리.그려질때까지();
    await verify('공통 바닥글에서 「개인정보처리방침」을 누르면 개인정보처리방침 화면이 보인다', await 제목.글('개인정보처리방침').isVisible(), true);
  });

  await test.step('상담 창을 연 뒤 「닫기」를 누른다', async () => {
    await 홈.머리만열기();
    await 상담.상담버튼.click();
    await 상담.창.waitFor();
    await 상담.닫기.click();
    await verify('공통 상담 창에서 「닫기」를 누르면 상담 창이 닫힌다', await 상담.창.isVisible(), false);
  });
});
