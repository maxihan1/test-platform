import type { Route } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지치우기, 새공지 } from './helpers/ops-api.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-767',
  name: '공지 지우기 응답이 500 이면 토스트가 뜨지 않고 공지 표가 그대로다',
  precondition: ['공지 지우기 응답은 500 가짜 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 공지화면(page);
  const 머리글 = '[QA] ARO-FN-767 ';
  const 제목 = `${머리글}${String(Date.now())}`;
  const 주소 = '**/api/ops/notices/*';
  const 가짜응답 = async (route: Route): Promise<void> => {
    if (route.request().method() !== 'DELETE') {
      await route.fallback();
      return;
    }
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL', message: '잠시 후 다시 시도해 주세요' }) });
  };
  await page.context().route(주소, 가짜응답);

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행의 [QA] 공지를 치운다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
    });

    await test.step('API 로 [QA] 공지를 만들고 「공지」를 연다', async () => {
      await 새공지(page, { title: 제목, body: `${머리글}내용`, startsAt: null, endsAt: null, enabled: true });
      await 화면.열기();
      await verify('[QA] 공지 줄이 공지 표에 보인다', await 화면.줄(제목).isVisible(), true, { blocker: true });
    });

    await test.step('[QA] 공지를 「지우기」로 지운다', async () => {
      await 화면.지우기버튼(제목).click();
      const 열렸다 = await 화면.창.열릴때까지();
      await verify('지우기 확인 창이 열린다', 열렸다, true, { blocker: true });
      const 응답 = page.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes('/api/ops/notices/'));
      await 화면.창.누르기('지우기');
      await 응답;
      await 화면.화면이다시그려질때까지();
      const 토스트없음 = await verify('토스트가 뜨지 않는다', await 화면.알림.모두.count(), 0);
      const 표그대로 = await verify('공지 표에 [QA] 공지 줄이 그대로 있다', await 화면.줄(제목).isVisible(), true);
      await verify('공지 지우기 응답이 500 이면 토스트가 뜨지 않고 공지 표가 그대로다', 토스트없음 && 표그대로, true);
    });
  } finally {
    await page.context().unroute(주소, 가짜응답);
    await 공지치우기(page, 머리글);
  }
});
