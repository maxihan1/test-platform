import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-524',
  name: '대시보드 응답이 500 이면 「죄송합니다, 뭔가 잘못 되었습니다.」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '관리 화면 응답은 가짜 응답(모킹) 500 이다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 프로필 = new 공개프로필화면(page);
  const 대시보드 = new 대시보드화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  const 대시보드주소 = '**/admin/dashboard';
  try {
    await test.step('관리 화면 응답을 가짜 응답(모킹) 500 으로 바꾼다', async () => {
      const 원본 = await page.request.get('/500.html');
      const 본문 = await 원본.text();
      await page.context().route(대시보드주소, async (경로) => {
        if (경로.request().resourceType() !== 'document') {
          await 경로.fallback();
          return;
        }
        await 경로.fulfill({ status: 500, contentType: 'text/html; charset=utf-8', body: 본문 });
      });
    });
    await test.step('「대시보드」 화면을 연다', async () => {
      const 상태 = await 대시보드.열기();
      await verify('관리 화면 응답은 가짜 응답(모킹) 500 이다', 상태, 500, { blocker: true });
      await verify('대시보드 응답이 500 이면 「죄송합니다, 뭔가 잘못 되었습니다.」가 보인다', await 관리.서버오류안내.isVisible(), true);
    });
  } finally {
    await page.context().unroute(대시보드주소);
  }
});
