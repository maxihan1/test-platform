import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 새창열기 } from './helpers/page-setup.helper.js';
import { 암호와보안화면 } from './pages/auth-settings.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-751',
  name: '세션 목록에서 다른 세션을 「삭제」하면 「세션을 성공적으로 취소하였습니다」가 보인다',
  precondition: ['일회용 · 계정 이동 대상 계정으로 두 창에서 로그인해 있다'],
  params: z.object({
    moveId: z.string().describe('일회용 · 계정 이동 대상 계정 이메일').optional().meta({ secret: true, account: '일회용 · 계정 이동 대상' }),
    movePassword: z.string().describe('일회용 · 계정 이동 대상 계정 암호').optional().meta({ secret: true, account: '일회용 · 계정 이동 대상' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 설정 = new 암호와보안화면(page);
  const 다른창 = await 새창열기(page);

  try {
    await test.step('일회용 · 계정 이동 대상 계정으로 두 창에서 로그인한다', async () => {
      await 로그인하기(page, params.moveId, params.movePassword);
      await 로그인하기(다른창.page, params.moveId, params.movePassword);
      await 설정.열기();
      await verify('세션 목록에 삭제할 수 있는 다른 세션이 있다', (await 설정.세션삭제.count()) > 0, true, { blocker: true });
    });

    await test.step('암호 및 보안 세션 목록에서 다른 창의 세션을 「삭제」한다', async () => {
      await 설정.세션삭제.first().click();
      const 떴다 = await 설정.세션삭제안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('세션 목록에서 다른 세션을 「삭제」하면 「세션을 성공적으로 취소하였습니다」가 보인다', 떴다, true);
    });
  } finally {
    await 다른창.창묶음.close();
  }
});
