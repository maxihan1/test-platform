import type { Route } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-024',
  name: '배너 응답 순서가 바뀌면 홈 배너도 그 순서로 보인다',
  precondition: ['배너 응답은 순서를 바꾼 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  let 응답순서: string[] = [];

  const 순서바꾸기 = async (route: Route): Promise<void> => {
    const 응답 = await route.fetch();
    const 본문 = (await 응답.json()) as { items: { title: string }[] };
    const 바꾼것 = [...본문.items].reverse();
    응답순서 = 바꾼것.map((배너) => 배너.title);
    await route.fulfill({ response: 응답, json: { items: 바꾼것 } });
  };

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await page.context().route('**/api/banners', 순서바꾸기);
  try {
    await test.step('홈을 연다', async () => {
      await 방해막기(page);
      await 홈.열기();
      await 홈.슬라이드.first().waitFor();
      await verify('배너 응답을 순서를 바꾼 가짜 응답으로 받았다', 응답순서.length > 1, true, { blocker: true });
      await verify('배너 응답 순서가 바뀌면 홈 배너도 그 순서로 보인다', (await 홈.슬라이드제목들()).join(', '), 응답순서.join(', '));
    });
  } finally {
    await page.context().unroute('**/api/banners', 순서바꾸기);
  }
});
