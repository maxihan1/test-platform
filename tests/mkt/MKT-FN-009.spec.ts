import { defineCase, test, verify } from '@platform/kit';

import { 바닥글 } from './components/footer.component.js';
import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 안정될때까지읽기, 화면내리기 } from './helpers/home.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-009',
  name: '페이지를 한 화면 이상 내리면 오른쪽 아래에 「맨 위로」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['화면 높이가 낮다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 바닥 = new 바닥글(page);

  await test.step('홈 화면을 한 화면 이상 내린다', async () => {
    await page.setViewportSize({ width: 1280, height: 400 });
    await 방해막기(page);
    await 홈.추천까지열기();
    await 머리.로그인링크.waitFor();
    await verify('화면 높이가 낮다', page.viewportSize()?.height, 400, { blocker: true });
    const 내린값 = await 화면내리기(page, 400);
    await verify('홈 화면을 한 화면 내렸다', 내린값, 400, { blocker: true });
    await verify(
      '페이지를 한 화면 이상 내리면 오른쪽 아래에 「맨 위로」 버튼이 보인다',
      { 보임: await 바닥.맨위로버튼.isVisible(), 오른쪽아래: await 홈.오른쪽아래에있는가(바닥.맨위로버튼) },
      { 보임: true, 오른쪽아래: true },
    );
  });

  await test.step('「맨 위로」 버튼을 누른다', async () => {
    await 바닥.맨위로버튼.click();
    const 위치 = await 안정될때까지읽기(() => page.evaluate(() => window.scrollY));
    await verify('「맨 위로」 버튼을 누르면 페이지 맨 위로 올라간다', 위치, 0);
  });
});
