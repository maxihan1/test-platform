import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 긴글 } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 신고창 } from './pages/report-dialog.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-677',
  name: '신고 추가 정보에 1,000자를 넣으면 다 들어간다',
  techniques: ['경계값 분석'],
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

  await test.step('일반 회원으로 로그인하고 hana_photo 글 신고 창의 추가 정보 단계를 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기('hana_photo');
    await 프로필.첫글메뉴열기();
    await 프로필.펼침.항목('@hana_photo 신고하기').click();
    await 신고.기타로추가정보까지가기();
    await verify('신고 창에 「추가 정보 입력」 칸이 보인다', await 신고.추가정보칸.isEditable(), true, { blocker: true });
  });

  try {
    await test.step('신고 창 넷째 단계 「추가 정보 입력」에 1,000자를 넣는다', async () => {
      await 신고.추가정보칸.fill(긴글(1000));
      await verify('신고 추가 정보에 1,000자를 넣으면 다 들어간다', (await 신고.추가정보칸.inputValue()).length, 1000);
    });

    await test.step('신고 창 넷째 단계 「추가 정보 입력」에 1,001자를 넣는다', async () => {
      await 신고.추가정보칸.fill(긴글(1001));
      await verify('1,001자 추가 정보는 1,000자를 넘겨 받지 않는다', (await 신고.추가정보칸.inputValue()).length > 1000, false);
    });
  } finally {
    await 신고.닫기누르기();
  }
});
