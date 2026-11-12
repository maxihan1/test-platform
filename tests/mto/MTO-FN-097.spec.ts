import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호, 고유이름 } from './helpers/api.helper.js';
import { 참고사항지우기 } from './helpers/account-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-097',
  name: '계정 상세에서 참고사항을 적고 「참고사항 남기기」를 누르면 「중재 참고사항을 만들었습니다!」가 보이고 목록에 그 글이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);
  let 번호 = '';
  let 글 = '';

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', new 로그인화면(page).로그인화면인가(), false, { blocker: true });
    });

    await test.step('qa_user2 계정 상세의 참고사항 칸에 글을 적고 「참고사항 남기기」를 누른다', async () => {
      번호 = await 계정번호(page, 'qa_user2');
      글 = `MTO 시험 참고사항 ${고유이름('n')}`;
      await 상세.열기(번호);
      await 상세.참고사항적기(글);
      const 알림 = await verify('「중재 참고사항을 만들었습니다!」가 보인다', await 상세.알림.글('중재 참고사항을 만들었습니다!').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
      const 목록 = await verify('목록에 그 글이 보인다', await 상세.참고사항(글).isVisible(), true);
      await verify('계정 상세에서 참고사항을 적고 「참고사항 남기기」를 누르면 「중재 참고사항을 만들었습니다!」가 보이고 목록에 그 글이 보인다', 알림 && 목록, true);
    });
  } finally {
    if (번호 && 글) await 참고사항지우기(page, 번호, 글);
  }
});
