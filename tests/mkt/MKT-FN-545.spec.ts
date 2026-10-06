import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 관리자계정값 } from './components/account.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-545',
  name: '「아이디 검색」에 글자를 적으면 아이디에 그 글자가 든 회원만 보인다',
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminLoginId: z.string().describe('관리자 아이디').default('admin'),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 계정 = 관리자계정값(params);
  const 관리자 = new 관리자화면(page);
  const 헤더 = new 머리글(page);

  await test.step('로그인 요청으로 관리자 계정에 로그인한다', async () => {
    await API로그인(page.request, 계정.loginId, 계정.password);
  });

  await test.step('관리자 계정으로 로그인해 있는지 확인한다', async () => {
    await 안내창끄기(page);
    await page.goto('/');
    await 헤더.로그아웃버튼.waitFor();
    await verify('로그인한 머리글에 「관리자」 링크가 보인다', await 헤더.관리자링크.isVisible(), true, { blocker: true });
  });

  await test.step('「아이디 검색」 칸에 「user」를 적는다', async () => {
    await 관리자.회원관리열기();
    await 관리자.아이디검색칸.fill('user');
    await 관리자.회원줄들.first().filter({ hasText: 'user' }).waitFor();
    const 아이디들 = await 관리자.보이는아이디들();
    await verify('「아이디 검색」에 글자를 적으면 아이디에 그 글자가 든 회원만 보인다', 아이디들.length > 0 && 아이디들.every((아이디) => 아이디.includes('user')), true);
  });
});
