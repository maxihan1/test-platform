import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-019',
  name: '「외관」 탭에서 「변경 사항을 저장」을 누르면 같은 탭이 다시 열리고 「정상적으로 변경되었습니다!」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 설정 = new 서버설정화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('「서버 설정」 › 「외관」 탭을 그대로 두고 「변경 사항을 저장」을 누른다', async () => {
    await 설정.열기('appearance');
    await 설정.저장하기();
    const 알림떴다 = await 설정.알림.글('정상적으로 변경되었습니다!').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    const 같은탭 = await verify('같은 탭이 다시 열린다', 설정.현재경로(), '/admin/settings/appearance');
    const 알림 = await verify('「정상적으로 변경되었습니다!」가 보인다', 알림떴다, true);
    await verify('「외관」 탭에서 「변경 사항을 저장」을 누르면 같은 탭이 다시 열리고 「정상적으로 변경되었습니다!」가 보인다', 같은탭 && 알림, true);
  });
});
