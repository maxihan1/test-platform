import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 커스텀에모지화면 } from './pages/custom-emojis.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-366',
  name: '커스텀 에모지에서 「로컬」을 누르면 「목록에 추가」 · 「목록에서 제거」가 보이고 「도메인」 칸과 「복사」는 보이지 않는다',
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

  await test.step('「커스텀 에모지」 화면에서 「로컬」을 누른다', async () => {
    await 목록.열기();
    await 목록.로컬필터.click();
    const 추가보임 = await 목록.목록에추가.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    const 추가버튼 = await verify('「목록에 추가」가 보인다', 추가보임, true);
    const 제거버튼 = await verify('「목록에서 제거」가 보인다', await 목록.목록에서제거.isVisible(), true);
    const 도메인 = await verify('「도메인」 칸이 보이지 않는다', await 목록.도메인칸.isVisible(), false);
    const 복사 = await verify('「복사」가 보이지 않는다', await 목록.복사.isVisible(), false);
    await verify('커스텀 에모지에서 「로컬」을 누르면 「목록에 추가」 · 「목록에서 제거」가 보이고 「도메인」 칸과 「복사」는 보이지 않는다', 추가버튼 && 제거버튼 && 도메인 && 복사, true);
  });
});
