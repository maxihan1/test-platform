import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-243',
  name: '콘텐츠 보존기한 탭에 「미디어 캐시 유지 기한」 · 「사용자 아카이브 유지 기한」 값 「7」 · 「리모트 콘텐츠 보유 기간」이 보인다',
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

  await test.step('「콘텐츠 보존기한」 탭을 연다', async () => {
    await 설정.열기('content_retention');
    const 미디어 = await verify('「미디어 캐시 유지 기한」이 보인다', await 설정.미디어캐시.isVisible(), true);
    const 아카이브 = await verify('「사용자 아카이브 유지 기한」 값이 「7」이다', await 설정.아카이브유지.inputValue(), '7');
    const 리모트 = await verify('「리모트 콘텐츠 보유 기간」이 보인다', await 설정.리모트보유.isVisible(), true);
    await verify('콘텐츠 보존기한 탭에 「미디어 캐시 유지 기한」 · 「사용자 아카이브 유지 기한」 값 「7」 · 「리모트 콘텐츠 보유 기간」이 보인다', 미디어 && 아카이브 && 리모트, true);
  });
});
