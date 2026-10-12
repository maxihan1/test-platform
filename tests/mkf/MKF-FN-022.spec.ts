import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 새회원정보, 회원가입, type 회원정보 } from './helpers/account.helper.js';
import { 가입자정리하기, 세션아이디 } from './helpers/common-tools.helper.js';
import { 응답본문엿보기 } from './helpers/board-extra.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-022',
  name: '로그인 응답 본문에 비밀번호 원문이 없다',
  precondition: ['비회원이다', '회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 머리 = new 머리글(page);
  const 계정: 회원정보 = 새회원정보();
  let 가입함 = false;

  try {
    await test.step('로그인할 임시 회원을 가입시킨다', async () => {
      await 회원가입(page.request, 계정);
      가입함 = true;
    });

    await test.step('비회원인지 확인한다', async () => {
      await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
    });

    await test.step('로그인 화면에서 회원 계정으로 로그인한다', async () => {
      await 방해막기(page);
      await 로그인.열기();
      await 로그인.제목.waitFor();
      const 엿봄 = await 응답본문엿보기(page, '**/api/auth/login');
      try {
        await 로그인.로그인하기(계정.loginId, 계정.password);
        await 머리.로그아웃.waitFor();
        await verify('로그인 응답 본문을 받았다', 엿봄.본문() !== '', true, { blocker: true });
        await verify('로그인 응답 본문에 비밀번호 원문이 없다', 엿봄.본문().includes(계정.password), false);
      } finally {
        await 엿봄.풀기();
      }
    });

    await test.step('회원으로 로그인했는지 확인한다', async () => {
      await verify('로그인한 회원이 맞다', (await 세션아이디(page)) === 계정.loginId, true, { blocker: true });
    });

    await test.step('현재 회원 정보 GET /api/auth/me 를 부른다', async () => {
      const 응답 = await page.request.get('/api/auth/me');
      await verify('현재 회원 정보 응답 본문에 비밀번호 원문이 없다', (await 응답.text()).includes(계정.password), false);
    });
  } finally {
    if (가입함) await 가입자정리하기(page.request, 계정);
  }
});
