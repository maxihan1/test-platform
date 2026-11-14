import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정설정화면 } from './pages/account-settings.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-247',
  name: '게시물 자동 삭제 화면에 「오래된 게시물 자동 삭제」 · 「기한」 · 「예외」가 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 설정 = new 계정설정화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
  });

  await test.step('게시물 자동 삭제 화면을 연다', async () => {
    await 설정.열기('/statuses_cleanup');
    const 자동삭제 = await verify('「오래된 게시물 자동 삭제」가 보인다', await 설정.체크('오래된 게시물 자동 삭제').isVisible(), true);
    const 기한 = await verify('「기한」이 보인다', await 설정.칸('기한').isVisible(), true);
    const 예외 = await verify('「예외」가 보인다', await 설정.소제목('예외').isVisible(), true);
    await verify('게시물 자동 삭제 화면에 「오래된 게시물 자동 삭제」 · 「기한」 · 「예외」가 보인다', 자동삭제 && 기한 && 예외, true);
  });
});
