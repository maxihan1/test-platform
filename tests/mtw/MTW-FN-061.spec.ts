import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-061',
  name: '관리자로 홈에서 「더 보기」를 누르면 「중재」 · 「관리」가 더 보인다',
  precondition: ['관리자로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 이메일').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 암호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);

  await test.step('관리자로 로그인한다', async () => {
    await 로그인하기(page, params.adminId, params.adminPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  await test.step('관리자로 홈에서 「더 보기」를 누른다', async () => {
    await 홈.열기();
    await 홈.메뉴.더보기.click();
    await 홈.펼침.열릴때까지();
    const 중재 = await verify('「중재」가 보인다', await 홈.펼침.항목(/^중재$/).isVisible(), true);
    const 관리 = await verify('「관리」가 보인다', await 홈.펼침.항목(/^관리$/).isVisible(), true);
    await verify('관리자로 홈에서 「더 보기」를 누르면 「중재」 · 「관리」가 더 보인다', 중재 && 관리, true);
  });
});
