import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 확인창받기 } from './helpers/dialog.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 커스텀에모지화면 } from './pages/custom-emojis.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-510',
  name: '커스텀 에모지에서 아무것도 고르지 않고 「비활성화」를 누르면 「아무 것도 선택 되지 않아 어떤 에모지도 바뀌지 않았습니다」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 목록 = new 커스텀에모지화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('「커스텀 에모지」 화면에서 아무것도 고르지 않고 「비활성화」를 누른다', async () => {
    await 목록.열기();
    const 창 = 확인창받기(page, '확인');
    await 목록.비활성화.click();
    await 창;
    const 보인다 = await 목록.알림.글('아무 것도 선택 되지 않아 어떤 에모지도 바뀌지 않았습니다').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('커스텀 에모지에서 아무것도 고르지 않고 「비활성화」를 누르면 「아무 것도 선택 되지 않아 어떤 에모지도 바뀌지 않았습니다」가 보인다', 보인다, true);
  });
});
