import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 확인창받기 } from './helpers/dialog.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정목록화면 } from './pages/account-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-461',
  name: '계정 목록에서 아무것도 고르지 않고 「정지」를 누르면 「아무 것도 선택 되지 않아 어떤 계정도 변경 되지 않았습니다」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 계정목록화면(page);

  await test.step('Owner 계정으로 로그인하고 「계정」 화면을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 목록.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('「계정」 화면에서 아무것도 고르지 않고 「정지」를 누른다', async () => {
    const 창 = 확인창받기(page, '확인');
    await 목록.정지.click();
    await 창;
    const 떴다 = await 목록.알림.글('아무 것도 선택 되지 않아 어떤 계정도 변경 되지 않았습니다').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('계정 목록에서 아무것도 고르지 않고 「정지」를 누르면 「아무 것도 선택 되지 않아 어떤 계정도 변경 되지 않았습니다」가 보인다', 떴다, true);
  });
});
