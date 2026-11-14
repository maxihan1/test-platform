import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 새창열기 } from './helpers/page-setup.helper.js';
import { 실시간피드화면 } from './pages/public-feed.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-042',
  name: '로그인 후 실시간 피드 머리말의 설정 버튼을 누르면 「미디어만」 · 「로컬만」이 보인다',
  precondition: ['일반 회원으로 로그인해 있다', '비회원이다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 실시간피드화면(page);

  await test.step('일반 회원으로 로그인하고 실시간 피드를 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 화면.열기();
    await verify('로그인 후 실시간 피드 머리말에 설정 버튼이 보인다', await 화면.설정버튼.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 후 실시간 피드 머리말의 설정 버튼을 누른다', async () => {
    await 화면.설정버튼.click();
    const 미디어만 = await verify('설정에 「미디어만」이 보인다', await 화면.설정항목('미디어만').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    const 로컬만 = await verify('설정에 「로컬만」이 보인다', await 화면.설정항목('로컬만').isVisible(), true);
    await verify('로그인 후 실시간 피드 머리말의 설정 버튼을 누르면 「미디어만」 · 「로컬만」이 보인다', 미디어만 && 로컬만, true);
  });

  await test.step('비회원으로 실시간 피드를 연다', async () => {
    const 손님 = await 새창열기(page);
    try {
      const 손님피드 = new 실시간피드화면(손님.page);
      await 손님피드.열기();
      await verify('비회원 실시간 피드에 「이 서버」 탭이 보인다', await 손님피드.이서버탭.isVisible(), true, { blocker: true });
      await verify('비회원 실시간 피드 머리말에는 설정 버튼이 없다', await 손님피드.설정버튼.count(), 0);
    } finally {
      await 손님.창묶음.close();
    }
  });
});
