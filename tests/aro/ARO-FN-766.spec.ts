import type { Route } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-766',
  name: '공지가 없으면 「공지가 없습니다」가 보인다',
  precondition: ['공지 목록 응답은 빈 목록 가짜 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 공지화면(page);
  const 주소 = '**/api/ops/notices';
  const 가짜응답 = async (route: Route): Promise<void> => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  };
  await page.context().route(주소, 가짜응답);

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    });

    await test.step('「공지」 화면을 연다', async () => {
      await 화면.열기();
      await verify('「공지」 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
      await verify('공지가 없으면 「공지가 없습니다」가 보인다', await 화면.비었음.isVisible(), true);
    });
  } finally {
    await page.context().unroute(주소, 가짜응답);
  }
});
