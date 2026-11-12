import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 릴레이화면 } from './pages/relays.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-487',
  name: '릴레이가 없을 때 「릴레이」 화면을 열면 연합 릴레이 설명과 「릴레이 연결 설정」 버튼이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '릴레이가 하나도 없다'],
  techniques: ['경계값 분석'],
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
    await verify('릴레이가 하나도 없다', await 릴레이.표.count(), 0, { blocker: true });
  });

  await test.step('「릴레이」 화면을 연다', async () => {
    await 릴레이.열기();
    const 설명 = await verify('연합 릴레이 설명이 보인다', await 릴레이.설명.isVisible(), true);
    const 버튼 = await verify('「릴레이 연결 설정」 버튼이 보인다', await 릴레이.연결설정.isVisible(), true);
    await verify('릴레이가 없을 때 「릴레이」 화면을 열면 연합 릴레이 설명과 「릴레이 연결 설정」 버튼이 보인다', 설명 && 버튼, true);
  });
});
