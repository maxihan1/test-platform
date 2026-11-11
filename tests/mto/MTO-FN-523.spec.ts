import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-523',
  name: '로그인하지 않고 /admin/dashboard 를 열면 「이 페이지를 표시할 권한이 없습니다.」가 보인다',
  precondition: ['로그인하지 않았다'],
  params: z.object({

  }),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 관리 = new 관리화면(page);
  const 로그인 = new 로그인화면(page);

  await test.step('로그인하지 않은 채로 시작한다', async () => {
    await 한국어로(page);
    await 로그인.열기();
    await verify('로그인하지 않았다', await 로그인.로그인버튼.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('주소 /admin/dashboard 를 연다', async () => {
    await 관리.열기('/admin/dashboard');
    await verify('로그인하지 않고 /admin/dashboard 를 열면 「이 페이지를 표시할 권한이 없습니다.」가 보인다', await 관리.오류.권한없음.isVisible(), true);
  });
});
