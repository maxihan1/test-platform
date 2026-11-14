import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-187',
  name: '이메일 확인을 마치지 않은 계정으로 로그인하면 「계속 하려면 이메일을 확인 받아야 합니다.」가 보인다',
  precondition: ['일회용 · 이메일 확인 대기 계정이 있다'],
  params: z.object({
    waitId: z.string().describe('이메일 확인 대기 계정 이메일').optional().meta({ secret: true, account: '일회용 · 이메일 확인 대기' }),
    waitPassword: z.string().describe('이메일 확인 대기 계정 암호').optional().meta({ secret: true, account: '일회용 · 이메일 확인 대기' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 한국어로(page);
    await 로그인.열기();
    await verify('로그인 화면에 「로그인」 버튼이 보인다', await 로그인.로그인버튼.isVisible(), true, { blocker: true });
  });

  await test.step('이메일 확인 대기 계정으로 로그인한다', async () => {
    await 로그인.로그인(params.waitId ?? '', params.waitPassword ?? '');
    const 떴다 = await 로그인.안내('계속 하려면 이메일을 확인 받아야 합니다.').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('이메일 확인을 마치지 않은 계정으로 로그인하면 「계속 하려면 이메일을 확인 받아야 합니다.」가 보인다', 떴다, true);
  });
});
