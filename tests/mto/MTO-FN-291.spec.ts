import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-291',
  name: '「상태 페이지 URL」에 「not a url」을 적고 저장하면 정보 탭에 머물고 「오류가 발생했습니다」로 시작하는 안내가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
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

  await test.step('「상태 페이지 URL」에 「not a url」을 적고 저장한다', async () => {
    await 설정.열기('about');
    await 설정.상태페이지.fill('not a url');
    await 설정.저장하기();
    const 오류떴다 = await 설정.오류안내.first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
    const 머문다 = await verify('정보 탭에 머문다', 설정.현재경로(), '/admin/settings/about');
    const 안내 = await verify('「오류가 발생했습니다」로 시작하는 안내가 보인다', 오류떴다, true);
    await verify('「상태 페이지 URL」에 「not a url」을 적고 저장하면 정보 탭에 머물고 「오류가 발생했습니다」로 시작하는 안내가 보인다', 머문다 && 안내, true);
  });
});
