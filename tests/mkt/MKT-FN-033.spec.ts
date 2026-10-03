import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 공통보충화면 } from './pages/common-misc.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-033',
  name: '로그인하면 서버 응답 본문에도 로그인한 뒤 화면에도 비밀번호 원문이 나오지 않는다',
  precondition: ['비회원이다'],
  params: z.object({
    loginId: z.string().min(1).describe('로그인 아이디').default('user2'),
    password: z.string().min(1).describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);
  const 머리 = new 머리글(page);
  const 화면 = new 공통보충화면(page);
  const 비밀번호 = params.password ?? '';

  let 로그인본문 = '';
  await page.context().route('**/api/auth/login', async (경로) => {
    const 응답 = await 경로.fetch();
    로그인본문 = await 응답.text();
    await 경로.fulfill({ response: 응답, body: 로그인본문 });
  });

  try {
    await test.step('로그인하면서 서버 응답과 화면을 읽는다', async () => {
      await 로그인.열기();
      await 로그인.로그인버튼().waitFor();
      await 로그인.로그인하기(params.loginId, 비밀번호);
      await 머리.로그아웃버튼().waitFor();
      const 현재회원본문 = await (await page.request.get('/api/auth/me')).text();
      const 세션본문 = await (await page.request.get('/api/session')).text();
      const 화면글자 = await 화면.화면글자();
      await verify(
        '서버 응답 본문에 비밀번호 원문이 들어 있지 않다',
        [로그인본문.includes(비밀번호), 현재회원본문.includes(비밀번호), 세션본문.includes(비밀번호)],
        [false, false, false],
      );
      await verify('로그인한 뒤 화면 어디에도 비밀번호 원문이 보이지 않는다', 화면글자.includes(비밀번호), false);
    });
  } finally {
    await page.context().unroute('**/api/auth/login');
  }
});
