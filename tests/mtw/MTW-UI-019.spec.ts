import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-019',
  name: '로그인 후 오른쪽 메뉴 셋째 구획에 「환경설정」 · 「더 보기」가 보인다',
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
    const 환경설정 = await verify('오른쪽 메뉴 셋째 구획에 「환경설정」이 보인다', await 홈.메뉴.링크('환경설정').isVisible(), true);
    const 더보기 = await verify('오른쪽 메뉴 셋째 구획에 「더 보기」가 보인다', await 홈.메뉴.더보기.isVisible(), true);
    await verify('로그인 후 오른쪽 메뉴 셋째 구획에 「환경설정」 · 「더 보기」가 보인다', 환경설정 && 더보기, true);
  });
});
