import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인폼 } from './components/login-form.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-004',
  name: '알림 수는 10초마다 새로 가져온다',
  platforms: ['desktop'],
  precondition: ['회원 계정으로 로그인해 있다', '시계를 제어할 수 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 로그인 = new 로그인폼(page);
  let 요청수 = 0;

  await test.step('시계를 제어하며 로그인 화면에서 로그인한다', async () => {
    await page.clock.install();
    await 홈.쿠키띠를치운다();
    await 홈.공지팝업을치운다();
    await 홈.설문을치운다();
    await 로그인.로그인한다(params.loginId, params.password ?? '');
  });

  await test.step('홈 화면을 열고 시계를 10초 앞으로 돌린다', async () => {
    page.on('request', (요청) => {
      if (/\/api\/notifications$/.test(요청.url()) && 요청.method() === 'GET') 요청수 += 1;
    });
    await 홈.열고알림응답을기다린다();
    const 열었을때 = 요청수;
    for (let 번 = 0; 번 < 2; 번 += 1) {
      await Promise.all([
        page.waitForRequest((요청) => /\/api\/notifications$/.test(요청.url()) && 요청.method() === 'GET'),
        page.clock.runFor(10000),
      ]);
    }
    await verify('알림 수는 10초마다 새로 가져온다', 요청수 - 열었을때, 2);
  });
});
