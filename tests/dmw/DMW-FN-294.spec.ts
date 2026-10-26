import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원탈퇴화면 } from './pages/my-withdraw.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-294',
  name: '「탈퇴하기」를 누르면 브라우저 확인 창 「정말 탈퇴하시겠습니까?」가 뜬다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 회원탈퇴화면(page);
  const 머리 = new 머리글(page);
  let 회원 = { loginId: '', password: '' };

  await test.step('일회용 회원으로 로그인한다', async () => {
    await 안내창막기(page);
    회원 = await 일회용회원으로로그인(page);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원.loginId, { blocker: true });
  });

  await test.step('회원 탈퇴 화면에서 「위 내용을 확인했습니다」를 켠다', async () => {
    await 화면.열기();
    await 화면.확인체크.check();
    await verify('「탈퇴하기」가 눌린다', await 화면.탈퇴하기.isEnabled(), true, { blocker: true });
  });

  await test.step('「탈퇴하기」를 누른다', async () => {
    const 글 = await 화면.탈퇴하기누르고_확인창에('취소');
    await verify('「탈퇴하기」를 누르면 브라우저 확인 창 「정말 탈퇴하시겠습니까?」가 뜬다', 글, '정말 탈퇴하시겠습니까?');
  });

  await test.step('확인 창에서 「확인」을 누른다', async () => {
    await 화면.탈퇴하기누르고_확인창에('확인');
    await 머리.메뉴열기();
    await 머리.로그인.waitFor();
    const 홈 = await verify('홈 화면으로 간다', new URL(page.url()).pathname, '/');
    const 로그인링크 = await verify('머리글에 「로그인」이 보인다', await 머리.로그인.isVisible(), true);
    await verify('탈퇴 확인 창에서 「확인」을 누르면 홈 화면으로 가고 머리글에 「로그인」이 보인다', 홈 && 로그인링크, true);
  });

  await test.step('탈퇴한 아이디로 로그인한다', async () => {
    const 응답 = await page.request.post('/api/auth/login', { data: { loginId: 회원.loginId, password: 회원.password, remember: false } });
    await verify('탈퇴한 아이디로 로그인하면 로그인되지 않는다', 응답.ok(), false);
  });
});
