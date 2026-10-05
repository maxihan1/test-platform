import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 만료까지남은일수, 로그인쿠키만료 } from './components/member-helpers.component.js';
import { 브라우저다시열기, 안내창끄기 } from './components/session.component.js';
import { 로그인화면 } from './pages/login.page.js';
import { 테스트계정값 } from './components/account.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-127',
  name: '「로그인 상태 유지」를 켜고 로그인하면 로그인 쿠키 만료가 7일 뒤다',
  precondition: ['비회원이다'],
  params: z.object({
    loginId: z.string().describe('테스트 계정 아이디').optional().meta({ secret: true }),
    password: z.string().describe('테스트 계정 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 계정 = 테스트계정값(params);
  let 현재 = page;

  try {
    await test.step('「로그인 상태 유지」를 켜고 테스트 계정으로 로그인한다', async () => {
      await 안내창끄기(현재);
      const 화면 = new 로그인화면(현재);
      await 화면.열기();
      await verify('로그인 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
      await 화면.로그인하기(계정.loginId, 계정.password, true);
      await new 머리글(현재).인사.waitFor();
      await verify(
        '「로그인 상태 유지」를 켜고 로그인하면 로그인 쿠키 만료가 7일 뒤다',
        만료까지남은일수(await 로그인쿠키만료(현재.context())),
        7,
      );
    });

    await test.step('브라우저를 닫았다가 다시 열어 쇼핑 화면을 연다', async () => {
      현재 = await 브라우저다시열기(현재);
      await 안내창끄기(현재);
      await 현재.goto('/shop');
      const 헤더 = new 머리글(현재);
      await 헤더.로그아웃버튼.or(헤더.로그인링크).waitFor();
      await verify('유지를 켠 로그인은 브라우저를 다시 열어도 머리글에 「로그아웃」이 보인다', await 헤더.로그아웃버튼.isVisible(), true);
    });

    await test.step('「로그인 상태 유지」를 끈 채 테스트 계정으로 로그인한다', async () => {
      await 현재.context().clearCookies();
      const 화면 = new 로그인화면(현재);
      await 화면.열기();
      await 화면.로그인하기(계정.loginId, 계정.password, false);
      await new 머리글(현재).인사.waitFor();
      await verify(
        '유지를 끄고 로그인하면 로그인 쿠키가 브라우저를 닫을 때 지워지는 쿠키다',
        만료까지남은일수(await 로그인쿠키만료(현재.context())),
        -1,
      );
    });

    await test.step('유지를 끈 로그인 뒤 브라우저를 닫았다가 다시 열어 쇼핑 화면을 연다', async () => {
      현재 = await 브라우저다시열기(현재);
      await 안내창끄기(현재);
      await 현재.goto('/shop');
      const 헤더 = new 머리글(현재);
      await 헤더.로그아웃버튼.or(헤더.로그인링크).waitFor();
      await verify('유지를 끈 로그인은 브라우저를 다시 열면 머리글에 「로그인」이 보인다', await 헤더.로그인링크.isVisible(), true);
    });
  } finally {
    if (현재 !== page) await 현재.context().close();
  }
});
