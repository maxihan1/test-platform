import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 신고창 } from './pages/report-dialog.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-225',
  name: '신고 창 첫 단계에 「서버 규칙을 위반합니다」가 없다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);
  const 신고 = new 신고창(page);

  await test.step('일반 회원으로 로그인하고 hana_photo 프로필을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기('hana_photo');
    await 프로필.첫글그려질때까지();
    await verify('프로필에 글 목록이 보인다', await 프로필.글목록.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('hana_photo 글 신고 창을 연다', async () => {
      await 프로필.첫글메뉴열기();
      await 프로필.펼침.항목('@hana_photo 신고하기').click();
      await 신고.뜰때까지();
      await verify('신고 창 첫 단계에 「마음에 안 듭니다」가 보인다', await 신고.분류('마음에 안 듭니다').isVisible(), true, { blocker: true });
      await verify('신고 창 첫 단계에 「서버 규칙을 위반합니다」가 없다', await 신고.분류('서버 규칙을 위반합니다').isVisible(), false);
    });
  } finally {
    if ((await 신고.창.count()) > 0) await 신고.닫기누르기();
  }
});
