import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-364',
  name: '계정 상세 「참고사항」에 placeholder 「어떤 대응을 했는지 설명 또는 그 밖의 관련된 갱신 사항들」 입력칸과 「참고사항 남기기」 버튼이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', new 로그인화면(page).로그인화면인가(), false, { blocker: true });
  });

  await test.step('qa_user2 계정 상세를 연다', async () => {
    await 상세.열기(await 계정번호(page, 'qa_user2'));
    const 칸 = await verify('「참고사항」에 placeholder 「어떤 대응을 했는지 설명 또는 그 밖의 관련된 갱신 사항들」 입력칸이 보인다', await 상세.참고사항칸.isVisible(), true);
    const 버튼 = await verify('「참고사항 남기기」 버튼이 보인다', await 상세.참고사항남기기.isVisible(), true);
    await verify('계정 상세 「참고사항」에 placeholder 「어떤 대응을 했는지 설명 또는 그 밖의 관련된 갱신 사항들」 입력칸과 「참고사항 남기기」 버튼이 보인다', 칸 && 버튼, true);
  });
});
