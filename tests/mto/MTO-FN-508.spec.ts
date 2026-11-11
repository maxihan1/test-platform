import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 그림만들기 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 커스텀에모지추가화면 } from './pages/custom-emoji-new.page.js';
import { 커스텀에모지화면 } from './pages/custom-emojis.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-508',
  name: '「짧은 코드」에 영문자 · 숫자 · _ 밖의 글자를 적으면 에모지가 만들어지지 않는다',
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
  const 추가 = new 커스텀에모지추가화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('「짧은 코드」에 「mto-코드」를 적고 PNG 를 올린다', async () => {
    await 추가.올리기('mto-코드', 그림만들기());
    await 추가.오류안내.first().waitFor({ timeout: 10_000 });
    await 목록.열기();
    await verify('「짧은 코드」에 영문자 · 숫자 · _ 밖의 글자를 적으면 에모지가 만들어지지 않는다', await 목록.에모지줄('mto-코드').count(), 0);
  });
});
