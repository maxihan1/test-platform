import { defineCase, test, verify } from '@platform/kit';

import { 비밀번호틀리기, 일회용회원만들기 } from './helpers/account.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-092',
  name: '잠긴 계정은 맞는 비밀번호로 로그인해도 로그인되지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['동등 분할', '상태 전이'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 로그인 = new 로그인화면(page);
  const 회원 = await 일회용회원만들기(request);
  await 안내창막기(page);

  await test.step('일회용 회원을 비밀번호 5번 틀려 잠근다', async () => {
    const 상태들 = await 비밀번호틀리기(request, 회원.loginId, 5);
    await verify('일회용 회원이 비밀번호를 5번 틀렸다', 상태들.length, 5, { blocker: true });
    await 로그인.열기();
    await verify('비회원이다', await 로그인.머리.로그인.isVisible(), true, { blocker: true });
  });

  await test.step('5번 틀려 잠긴 일회용 회원으로 맞는 비밀번호를 넣어 로그인한다', async () => {
    await 로그인.실패하는시도(회원.loginId, 회원.password);
    await verify('잠긴 계정은 맞는 비밀번호로 로그인해도 로그인되지 않는다', await 로그인.머리.로그아웃.isVisible(), false);
  });
});
