import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 새회원정보, 회원가입 } from './helpers/account.helper.js';
import { 가입자정리하기, 경로, 요청세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-075',
  name: '맞는 아이디와 비밀번호로 로그인하면 홈 화면으로 간다',
  precondition: ['새로 가입한 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 머리 = new 머리글(page);
  const 정보 = 새회원정보();

  try {
    await test.step('새로 가입한 회원을 만든다', async () => {
      await 회원가입(page.request, 정보);
    });

    await test.step('새 회원이 있는지 확인한다', async () => {
      const 응답 = await page.request.get(`/api/auth/check-id?loginId=${정보.loginId}`);
      const 본문 = (await 응답.json()) as { available: boolean };
      await verify('새 회원의 아이디가 이미 쓰이고 있다', 본문.available, false, { blocker: true });
    });

    await test.step('비회원인지 확인한다', async () => {
      await verify('로그인한 회원이 없다', await 요청세션아이디(page.request), null, { blocker: true });
    });

    await test.step('로그인 화면에서 그 회원의 아이디와 비밀번호로 로그인한다', async () => {
      await 방해막기(page);
      await 로그인.열기();
      await 로그인.제목.waitFor();
      await 로그인.로그인하기(정보.loginId, 정보.password);
      await 머리.로그아웃.waitFor();
      await verify('맞는 아이디와 비밀번호로 로그인하면 홈 화면으로 간다', 경로(page), '/');
    });
  } finally {
    await 가입자정리하기(page.request, 정보);
  }
});
