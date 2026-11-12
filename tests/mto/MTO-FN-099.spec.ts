import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호, 고유이름 } from './helpers/api.helper.js';
import { 확인창받기 } from './helpers/dialog.helper.js';
import { 참고사항지우기 } from './helpers/account-data.helper.js';
import { 로그인하기, 새창으로로그인 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-099',
  name: 'Owner 가 Moderator 의 참고사항을 지우면 목록에서 그 글이 사라진다',
  precondition: ['Moderator 가 qa_user2 에 남긴 참고사항이 있다', 'Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    modId: z.string().describe('Moderator 아이디').optional().meta({ secret: true, account: '중재자' }),
    modPassword: z.string().describe('Moderator 비밀번호').optional().meta({ secret: true, account: '중재자' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);
  let 번호 = '';
  let 글 = '';

  try {
    await test.step('Moderator 창으로 qa_user2 에 참고사항을 남기고 Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      번호 = await 계정번호(page, 'qa_user2');
      글 = `MTO 시험 참고사항 ${고유이름('n')}`;
      const 중재창 = await 새창으로로그인(page, params.modId, params.modPassword);
      try {
        const 중재상세 = new 계정상세화면(중재창);
        await 중재상세.열기(번호);
        await 중재상세.참고사항적기(글);
      } finally {
        await 중재창.context().close();
      }
    });

    await test.step('Moderator 가 남긴 참고사항이 있는지 확인한다', async () => {
      await 상세.열기(번호);
      await verify('Moderator 가 qa_user2 에 남긴 참고사항이 있다', await 상세.참고사항(글).isVisible(), true, { blocker: true });
    });

    await test.step('Moderator 가 남긴 참고사항의 「삭제」를 누른다', async () => {
      void 확인창받기(page, '확인');
      await 상세.참고사항삭제(글).click();
      await 상세.알림.글('중재 참고사항을 지웠습니다!').waitFor();
      await verify('Owner 가 Moderator 의 참고사항을 지우면 목록에서 그 글이 사라진다', await 상세.참고사항(글).isVisible(), false);
    });
  } finally {
    if (번호 && 글) await 참고사항지우기(page, 번호, 글);
  }
});
