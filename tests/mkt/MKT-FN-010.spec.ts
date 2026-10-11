import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 안정될때까지읽기, 화면내리기 } from './helpers/home.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-010',
  name: '페이지를 79px 내리면 머리글이 화면 위에 붙지 않는다',
  platforms: ['desktop'],
  precondition: ['화면 높이가 낮다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);

  await test.step('홈 화면을 79px 내린다', async () => {
    await page.setViewportSize({ width: 1280, height: 400 });
    await 방해막기(page);
    await 홈.추천까지열기();
    await 머리.로그인링크.waitFor();
    await verify('화면 높이가 낮다', page.viewportSize()?.height, 400, { blocker: true });
    await verify('홈 화면을 79px 내렸다', await 화면내리기(page, 79), 79, { blocker: true });
    await verify('페이지를 79px 내리면 머리글이 화면 위에 붙지 않는다', await 홈.머리글붙음(), false);
    await verify('페이지를 79px 내리면 머리글 높이가 64px 이다', await 안정될때까지읽기(() => 홈.머리글높이()), 64);
  });

  await test.step('홈 화면을 80px 내린다', async () => {
    await verify('홈 화면을 80px 내렸다', await 화면내리기(page, 80), 80, { blocker: true });
    await verify('페이지를 80px 내리면 머리글이 화면 위에 붙는다', await 홈.머리글붙음(), true);
    await verify('페이지를 80px 내리면 머리글 높이가 48px 로 줄어든다', await 안정될때까지읽기(() => 홈.머리글높이()), 48);
  });
});
