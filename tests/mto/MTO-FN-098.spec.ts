import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호, 고유이름 } from './helpers/api.helper.js';
import { 확인창받기 } from './helpers/dialog.helper.js';
import { 참고사항지우기 } from './helpers/account-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-098',
  name: 'Owner 가 자기가 남긴 참고사항을 지우면 「중재 참고사항을 지웠습니다!」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 qa_user2 에 남긴 참고사항이 있다'],
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
    await test.step('Owner 계정으로 로그인하고 qa_user2 에 참고사항을 남긴다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      번호 = await 계정번호(page, 'qa_user2');
      글 = `MTO 시험 참고사항 ${고유이름('n')}`;
      await 상세.열기(번호);
      await 상세.참고사항적기(글);
      await verify('케이스가 qa_user2 에 남긴 참고사항이 있다', await 상세.참고사항(글).isVisible(), true, { blocker: true });
    });

    await test.step('내가 남긴 참고사항의 「삭제」를 누른다', async () => {
      void 확인창받기(page, '확인');
      await 상세.참고사항삭제(글).click();
      const 떴다 = await 상세.알림.글('중재 참고사항을 지웠습니다!').waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('Owner 가 자기가 남긴 참고사항을 지우면 「중재 참고사항을 지웠습니다!」가 보인다', 떴다, true);
    });
  } finally {
    if (번호 && 글) await 참고사항지우기(page, 번호, 글);
  }
});
