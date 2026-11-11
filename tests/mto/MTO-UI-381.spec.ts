import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 이의제기화면 } from './pages/appeals.page.js';
import { 처벌상세화면 } from './pages/strike-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-381',
  name: '이의제기 행을 누르면 처벌 상세에 「이의제기 승인」 · 「이의 제기 거절」 버튼이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '대기 중 이의제기(troll_kim)가 1건 이상 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 화면 = new 이의제기화면(page);
  const 상세 = new 처벌상세화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 화면.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 화면.제목.isVisible(), true, { blocker: true });
    await verify('대기 중 이의제기(troll_kim)가 1건 이상 있다', (await 화면.줄('troll_kim').count()) > 0, true, { blocker: true });
  });

  await test.step('이의제기 목록에서 troll_kim 행을 누른다', async () => {
    await 화면.줄('troll_kim').click();
    await 상세.제목.waitFor();
    const 승인 = await verify('「이의제기 승인」 버튼이 보인다', await 상세.이의제기승인.isVisible(), true);
    const 거절 = await verify('「이의 제기 거절」 버튼이 보인다', await 상세.이의제기거절.isVisible(), true);
    await verify('이의제기 행을 누르면 처벌 상세에 「이의제기 승인」 · 「이의 제기 거절」 버튼이 보인다', 승인 && 거절, true);
  });
});
