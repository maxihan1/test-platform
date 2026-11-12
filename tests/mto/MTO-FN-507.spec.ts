import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 에모지코드 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 커스텀에모지화면 } from './pages/custom-emojis.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-507',
  name: '커스텀 에모지 목록에 맞는 것이 없으면 「아무 것도 없습니다!」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 목록 = new 커스텀에모지화면(page);
  const 코드 = 에모지코드(10);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('「짧은 코드」 칸에 없는 코드를 적고 「검색」을 누른다', async () => {
    await 목록.열기();
    await 목록.코드검색(`없는코드${코드}`);
    const 보인다 = await 목록.빈결과.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('커스텀 에모지 목록에 맞는 것이 없으면 「아무 것도 없습니다!」가 보인다', 보인다, true);
  });
});
