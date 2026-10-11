import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { 둘째아이디, 방해막기, 화면로그인, API로그인 } from './helpers/account.helper.js';
import { 틀린비밀번호, 새브라우저로옮기기, 아이디가있는가 } from './helpers/member.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-035',
  name: '맞는 아이디와 비밀번호로 로그인하면 홈 화면으로 가고 머리글에 「로그아웃」 이 보인다',
  platforms: ['desktop'],
  precondition: [
    '비회원이다',
    '두 번째 회원 계정을 쓴다',
    '회원으로 로그인해 있다',
  ],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 로그인 = new 로그인화면(page);
  const 머리 = new 머리글(page);
  const 창 = new 모달(page);
  const 비밀번호 = params.password ?? '';

  try {
    await 방해막기(page);

    await test.step('로그인 화면에서 맞는 아이디와 비밀번호로 「로그인」 을 누른다', async () => {
      await 로그인.열기();
      await 머리.로그인링크.waitFor();
      await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
      await 로그인.입력하기(params.loginId ?? '', 비밀번호);
      await 로그인.누르기();
      await 머리.인사.waitFor();
      await verify('맞는 아이디와 비밀번호로 로그인하면 홈 화면으로 가고 머리글에 「로그아웃」 이 보인다', { 경로: new URL(page.url()).pathname, 로그아웃버튼: await 머리.로그아웃버튼.isVisible() }, { 경로: '/', 로그아웃버튼: true });
    });

    await test.step('로그인 화면 비밀번호 칸에서 Enter 를 친다', async () => {
      await page.context().clearCookies();
      await 로그인.열기();
      await 머리.로그인링크.waitFor();
      await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
      await 로그인.입력하기(params.loginId ?? '', 비밀번호);
      await 로그인.비밀번호칸.press('Enter');
      await 머리.인사.waitFor();
      await verify('비밀번호 칸에서 Enter 를 치면 로그인되어 홈 화면으로 간다', { 경로: new URL(page.url()).pathname, 로그아웃버튼: await 머리.로그아웃버튼.isVisible() }, { 경로: '/', 로그아웃버튼: true });
    });

    await test.step('두 번째 회원으로 비밀번호를 4번 틀린 뒤 로그인하고 다시 4번 틀린다', async () => {
      await verify('두 번째 회원 아이디가 있다', await 아이디가있는가(request, 둘째아이디), true, { blocker: true });
      const 처음넷: number[] = [];
      for (let 번 = 0; 번 < 4; 번 += 1) 처음넷.push(await API로그인(request, 둘째아이디, 틀린비밀번호));
      await verify('틀린 비밀번호 4번으로는 계정이 잠기지 않는다', 처음넷, [401, 401, 401, 401], { blocker: true });
      const 성공 = await API로그인(request, 둘째아이디, 비밀번호);
      const 다시넷: number[] = [];
      for (let 번 = 0; 번 < 4; 번 += 1) 다시넷.push(await API로그인(request, 둘째아이디, 틀린비밀번호));
      await verify('로그인에 성공한 뒤에는 다시 4번 틀려도 계정이 잠기지 않는다', { 성공, 다시넷 }, { 성공: 200, 다시넷: [401, 401, 401, 401] });
    });

    await test.step('「로그인 상태 유지」 를 켜고 로그인한 뒤 브라우저를 닫았다 연다', async () => {
      await page.context().clearCookies();
      await 로그인.열기();
      await 머리.로그인링크.waitFor();
      await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
      await 로그인.입력하기(params.loginId ?? '', 비밀번호);
      await 로그인.로그인상태유지.check();
      await 로그인.누르기();
      await 머리.인사.waitFor();
      const 새창 = await 새브라우저로옮기기(page);
      try {
        const 새머리 = new 머리글(새창.쪽);
        await 새창.쪽.goto('/');
        await 새머리.로그인링크.or(새머리.로그아웃버튼).waitFor();
        await verify('「로그인 상태 유지」 를 켜고 로그인하면 브라우저를 닫았다 열어도 로그인되어 있다', await 새머리.로그아웃버튼.isVisible(), true);
      } finally {
        await 새창.닫기();
      }
    });

    await test.step('「로그인 상태 유지」 를 켜고 로그인한 뒤 로그인 쿠키를 확인한다', async () => {
      await page.context().clearCookies();
      await 로그인.열기();
      await 머리.로그인링크.waitFor();
      await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
      await 로그인.입력하기(params.loginId ?? '', 비밀번호);
      await 로그인.로그인상태유지.check();
      await 로그인.누르기();
      await 머리.인사.waitFor();
      const 로그인쿠키 = (await page.context().cookies()).find((쿠키) => 쿠키.httpOnly);
      const 남은날 = Math.round(((로그인쿠키?.expires ?? -1) - Date.now() / 1000) / 86400);
      await verify('「로그인 상태 유지」 를 켜고 로그인하면 로그인 쿠키가 7일 뒤에 만료된다', 남은날, 7);
    });

    await test.step('「로그인 상태 유지」 를 끄고 로그인한 뒤 브라우저를 닫았다 연다', async () => {
      await page.context().clearCookies();
      await 로그인.열기();
      await 머리.로그인링크.waitFor();
      await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
      await 로그인.입력하기(params.loginId ?? '', 비밀번호);
      await 로그인.누르기();
      await 머리.인사.waitFor();
      const 새창 = await 새브라우저로옮기기(page);
      try {
        const 새머리 = new 머리글(새창.쪽);
        await 새창.쪽.goto('/');
        await 새머리.로그인링크.or(새머리.로그아웃버튼).waitFor();
        await verify('「로그인 상태 유지」 를 끄고 로그인하면 브라우저를 닫았다 열 때 로그아웃되어 있다', await 새머리.로그인링크.isVisible(), true);
      } finally {
        await 새창.닫기();
      }
    });

    await test.step('회원으로 로그인한다', async () => {
      await page.context().clearCookies();
      await 화면로그인(page, params.loginId ?? '', 비밀번호);
      await 머리.로그아웃버튼.waitFor();
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    });

    await test.step('머리글 「로그아웃」 을 누른다', async () => {
      await 머리.로그아웃버튼.click();
      await 창.창.waitFor();
      await verify('「로그아웃」 을 누르면 확인 창 「로그아웃 하시겠습니까?」 가 뜬다', await 창.본문.innerText(), '로그아웃 하시겠습니까?');
    });

    await test.step('로그아웃 확인 창에서 「확인」 을 누른다', async () => {
      await 창.버튼('확인').click();
      await 머리.로그인링크.waitFor();
      await verify('로그아웃 확인 창에서 「확인」 을 누르면 로그아웃되어 홈 화면으로 간다', { 경로: new URL(page.url()).pathname, 로그아웃버튼: await 머리.로그아웃버튼.isVisible() }, { 경로: '/', 로그아웃버튼: false });
    });
  } finally {
    await API로그인(request, 둘째아이디, 비밀번호);
  }
});
