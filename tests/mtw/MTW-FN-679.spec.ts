import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 가짜응답, type 풀기 as 풀기타입 } from './helpers/mock.helper.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 신고창 } from './pages/report-dialog.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-679',
  name: '「마음에 안 듭니다」를 고르고 「다음」을 누르면 바로 「이런 것을 보지 않길 원하나요?」 단계로 간다',
  precondition: ['일반 회원으로 로그인해 있다', '신고 제출 응답은 가짜 응답(모킹)이다'],
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

  await test.step('일반 회원으로 로그인하고 hana_photo 글 신고 창을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    풀기값 = await 가짜응답(page, /\/api\/v1\/reports$/, { 상태: 200, 본문: { id: '1', action_taken: false, action_taken_at: null, category: 'other', comment: '', forwarded: false, created_at: '2026-01-01T00:00:00.000Z', status_ids: [], rule_ids: [] } });
    await 프로필.열기('hana_photo');
    await 프로필.첫글메뉴열기();
    await 프로필.펼침.항목('@hana_photo 신고하기').click();
    await 신고.뜰때까지();
    await verify('신고 창 첫 단계에 「마음에 안 듭니다」가 보인다', await 신고.분류('마음에 안 듭니다').isVisible(), true, { blocker: true });
  });

  try {
    await test.step('신고 창에서 「마음에 안 듭니다」를 고르고 「다음」을 누른다', async () => {
      await 신고.분류고르고다음('마음에 안 듭니다');
      const 떴다 = await 신고.제목.filter({ hasText: '이런 것을 보지 않길 원하나요?' }).waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('「마음에 안 듭니다」를 고르고 「다음」을 누르면 바로 「이런 것을 보지 않길 원하나요?」 단계로 간다', 떴다, true);
    });
  } finally {
    if (풀기값 !== undefined) await 풀기값();
    if ((await 신고.창.count()) > 0) await 신고.닫기누르기();
  }
});
