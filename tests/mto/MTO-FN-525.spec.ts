import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-525',
  name: '참고사항 칸에 2,001자를 넣으면 2,000자까지만 들어간다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '조치 대상 qa_user2 가 제재 없는 상태다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);

  await test.step('Owner 계정으로 로그인해 qa_user2 계정 상세를 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 상세.열기(await 계정번호(page, 'qa_user2'));
    await verify('참고사항 칸이 보인다', await 상세.참고사항칸.isVisible(), true, { blocker: true });
  });

  await test.step('qa_user2 계정 상세 참고사항 칸에 2,001자를 넣는다', async () => {
    await 상세.참고사항칸.fill('가'.repeat(2001));
    await verify('참고사항 칸에 2,001자를 넣으면 2,000자까지만 들어간다', (await 상세.참고사항칸.inputValue()).length, 2000);
  });
});
