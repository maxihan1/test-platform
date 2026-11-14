import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-099',
  name: '로그인 후 화면이 왼쪽 열 · 가운데 열 · 오른쪽 열로 나뉘어 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 홈.열기();
    const 왼쪽 = await verify('왼쪽 열이 보인다', await 홈.왼쪽열.isVisible(), true);
    const 가운데 = await verify('가운데 열이 보인다', await 홈.가운데열.isVisible(), true);
    const 오른쪽 = await verify('오른쪽 열이 보인다', await 홈.메뉴.영역.isVisible(), true);
    await verify('로그인 후 화면이 왼쪽 열 · 가운데 열 · 오른쪽 열로 나뉘어 보인다', 왼쪽 && 가운데 && 오른쪽, true);
  });
});
