import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 쇼핑화면 } from './pages/common-shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-028',
  name: '쇼핑 화면을 한 화면 넘게 내리면 오른쪽 아래에 「맨 위로」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 쇼핑 = new 쇼핑화면(page);

  await test.step('쇼핑 화면을 연다', async () => {
    await 안내창끄기(page);
    await 쇼핑.열기();
    await verify('비회원이다', await 쇼핑.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('쇼핑 화면을 한 화면 넘게 내린다', async () => {
    await 쇼핑.맨위로.한화면넘게내리기();
    await verify(
      '쇼핑 화면을 한 화면 넘게 내리면 오른쪽 아래에 「맨 위로」 버튼이 보인다',
      (await 쇼핑.맨위로.버튼.isVisible()) && (await 쇼핑.맨위로.오른쪽아래인가()),
      true,
    );
  });

  await test.step('「맨 위로」 버튼을 누른다', async () => {
    await 쇼핑.맨위로.버튼.click();
    await 쇼핑.맨위로.버튼.waitFor({ state: 'hidden' });
    await verify('화면이 맨 위로 올라간다', await 쇼핑.맨위로.멈출때까지기다리기(), 0);
  });
});
