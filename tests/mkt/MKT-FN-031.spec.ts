import type { Route } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-031',
  name: '배너 목록 응답 순서를 바꾸면 홈 첫 배너가 응답의 첫 배너로 보인다',
  precondition: ['비회원이다', '배너 목록 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  let 응답첫제목 = '';

  const 순서바꾸기 = async (route: Route): Promise<void> => {
    const 응답 = await route.fetch();
    const 본문 = (await 응답.json()) as { items: { title: string }[] };
    const 바꾼것 = [...본문.items].reverse();
    응답첫제목 = 바꾼것[0]?.title ?? '';
    await route.fulfill({ response: 응답, json: { items: 바꾼것 } });
  };

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await page.context().route('**/api/banners', 순서바꾸기);
  try {
    await test.step('배너 목록 응답의 순서를 바꾸고 홈을 연다', async () => {
      await 방해막기(page);
      await 홈.열기();
      await 홈.슬라이드.first().waitFor();
      await verify('배너 목록 응답 순서를 바꾸면 홈 첫 배너가 응답의 첫 배너로 보인다', await 홈.첫슬라이드제목(), 응답첫제목);
    });
  } finally {
    await page.context().unroute('**/api/banners', 순서바꾸기);
  }
});
