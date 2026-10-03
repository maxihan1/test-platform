import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 맨위로버튼 } from './components/to-top.component.js';
import { 홈화면 } from './pages/home.page.js';
import { 상품목록 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-008',
  name: '페이지를 한 화면 이상 내리면 「맨 위로」 버튼이 보이고 누르면 맨 위로 올라간다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '화면 높이보다 긴 쇼핑 목록 화면이 열려 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 목록 = new 상품목록(page);
  const 위로 = new 맨위로버튼(page);

  await test.step('쇼핑 목록 화면을 연다', async () => {
    await 홈.쿠키띠를치운다();
    await 목록.열고기다린다();
    await verify('화면 높이보다 긴 쇼핑 목록 화면이 열려 있다', await 홈.문서가화면보다긴가(), true, { blocker: true });
  });

  await test.step('화면을 한 화면 높이 이상 내린다', async () => {
    await 홈.한화면내린다();
    const 보임 = await 위로.버튼.waitFor({ state: 'visible', timeout: 3000 }).then(
      () => true,
      () => false,
    );
    const 상자 = 보임 ? await 위로.버튼.boundingBox() : null;
    const 화면 = page.viewportSize();
    await verify(
      '페이지를 한 화면 이상 내리면 오른쪽 아래에 「맨 위로」 버튼이 보인다',
      보임 && (상자?.x ?? 0) > (화면?.width ?? 0) / 2 && (상자?.y ?? 0) > (화면?.height ?? 0) / 2,
      true,
    );
  });

  await test.step('「맨 위로」 버튼을 누른다', async () => {
    await 위로.버튼.click();
    const 올라감 = await 홈.맨위까지기다린다();
    await verify('「맨 위로」 버튼을 누르면 화면이 맨 위로 올라간다', [올라감, await 홈.스크롤위치()], [true, 0]);
  });
});
