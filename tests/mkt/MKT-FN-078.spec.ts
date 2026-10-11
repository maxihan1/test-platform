import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 계정값 } from './helpers/account.helper.js';
import { 브라우저닫았다다시열기, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-078',
  name: '「로그인 상태 유지」를 켜고 로그인하면 브라우저를 다시 열어도 머리글에 「로그아웃」이 보인다',
  precondition: ['비회원이다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 계정 = 계정값(params);
  const 로그인 = new 로그인화면(page);
  const 머리 = new 머리글(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('「로그인 상태 유지」를 켜고 로그인한 뒤 브라우저를 닫았다 다시 연다', async () => {
    await 방해막기(page);
    await 로그인.열기();
    await 로그인.제목.waitFor();
    await 로그인.상태유지.check();
    await 로그인.로그인하기(계정.loginId, 계정.password);
    await 머리.로그아웃.waitFor();
    const 다시 = await 브라우저닫았다다시열기(page);
    try {
      await 방해막기(다시.새쪽);
      await 다시.새쪽.goto('/');
      const 새머리 = new 머리글(다시.새쪽);
      await 새머리.로고.waitFor();
      await verify('「로그인 상태 유지」를 켜고 로그인하면 브라우저를 다시 열어도 머리글에 「로그아웃」이 보인다', await 새머리.로그아웃.isVisible(), true);
    } finally {
      await 다시.닫기();
    }
  });

  await test.step('「로그인 상태 유지」를 켜고 로그인한다', async () => {
    await 로그인.열기();
    await 로그인.제목.waitFor();
    await 로그인.상태유지.check();
    await 로그인.로그인하기(계정.loginId, 계정.password);
    await 머리.로그아웃.waitFor();
    const 만료들 = (await page.context().cookies()).filter((쿠키) => 쿠키.expires > 0).map((쿠키) => 쿠키.expires);
    const 남은날 = Math.round((Math.max(...만료들) - Date.now() / 1000) / 86400);
    await verify('「로그인 상태 유지」를 켜고 로그인하면 로그인 쿠키 만료가 7일 뒤다', { 만료쿠키있음: 만료들.length > 0, 남은날 }, { 만료쿠키있음: true, 남은날: 7 });
  });
});
