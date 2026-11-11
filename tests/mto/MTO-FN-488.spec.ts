import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 릴레이화면 } from './pages/relays.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-488',
  name: '보안 모드 서버에서 「릴레이」 화면을 열면 「시큐어모드나 제한된 페더레이션 모드를 사용하고 있다면 릴레이는 제대로 동작하지 않을 것입니다」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  held: '보류 — 보안 모드나 연합 제한 모드인 서버',
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 릴레이 = new 릴레이화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 릴레이.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 릴레이.제목.isVisible(), true, { blocker: true });
  });

  await test.step('보안 모드 서버에서 「릴레이」 화면을 연다', async () => {
    await 릴레이.열기();
    await verify('보안 모드 서버에서 「릴레이」 화면을 열면 「시큐어모드나 제한된 페더레이션 모드를 사용하고 있다면 릴레이는 제대로 동작하지 않을 것입니다」가 보인다', await 릴레이.보안모드경고.isVisible(), true);
  });
});
