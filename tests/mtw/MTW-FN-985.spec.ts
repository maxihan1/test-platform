import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 가짜응답, type 풀기 as 풀기타입 } from './helpers/mock.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 신고창 } from './pages/report-dialog.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-985',
  name: '신고 제출 응답이 실패하면 「신고를 제출할 수 없습니다」가 보인다',
  techniques: ['동등 분할'],
  precondition: ['신고 제출 응답은 가짜 응답(모킹)이다', '일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);
  const 신고 = new 신고창(page);
  let 풀기값: 풀기타입 | undefined;

  await test.step('일반 회원으로 로그인하고 hana_photo 글 신고 창의 마지막 단계를 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    풀기값 = await 가짜응답(page, /\/api\/v1\/reports$/, { 상태: 500, 본문: { error: '서버 오류' } });
    await 프로필.열기('hana_photo');
    await 프로필.첫글메뉴열기();
    await 프로필.펼침.항목('@hana_photo 신고하기').click();
    await 신고.기타로추가정보까지가기();
    await verify('신고 창에 「추가 정보 입력」 칸이 보인다', await 신고.추가정보칸.isEditable(), true, { blocker: true });
  });

  try {
    await test.step('신고 창을 끝까지 채워 「신고하기」를 누른다', async () => {
      await 신고.추가정보칸.fill(표식('rp'));
      await 신고.신고하기.click();
      const 보인다 = await 신고.실패안내.first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('신고 제출 응답이 실패하면 「신고를 제출할 수 없습니다」가 보인다', 보인다, true);
    });
  } finally {
    if (풀기값 !== undefined) await 풀기값();
    if ((await 신고.창.count()) > 0) await 신고.닫기누르기();
  }
});
