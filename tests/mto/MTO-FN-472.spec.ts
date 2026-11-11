import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기, 신고닫기 } from './helpers/account.helper.js';
import { 계정번호 } from './helpers/api.helper.js';
import { 확인창받기 } from './helpers/dialog.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 계정게시물화면 } from './pages/account-statuses.page.js';
import { 신고상세화면 } from './pages/report-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-472',
  name: '계정 게시물에서 게시물을 골라 「신고」를 누르면 그 게시물이 든 신고 상세가 열린다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '조치 대상 qa_user2 가 제재 없는 상태다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);
  const 게시 = new 계정게시물화면(page);
  const 신고 = new 신고상세화면(page);
  let 번호 = '';
  let 신고번호 = '';

  try {
    await test.step('Owner 계정으로 로그인하고 qa_user2 제재를 푼다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await qa_user2되돌리기(page);
    });
    
    await test.step('qa_user2 가 제재 없는 상태인지 확인한다', async () => {
      번호 = await 계정번호(page, 'qa_user2');
      await 상세.열기(번호);
      await verify('조치 대상 qa_user2 가 제재 없는 상태다', (await 상세.상태.innerText()).trim(), '제한 없음', { blocker: true });
    });

    await test.step('「계정 게시물 - @qa_user2」에서 게시물 하나를 골라 「신고」를 누른다', async () => {
      await 게시.열기(번호);
      await 게시.그려질때까지();
      await 게시.첫행선택칸().check();
      const 창 = 확인창받기(page, '확인');
      await 게시.신고.click();
      await 창;
      const 열림 = await 신고.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      신고번호 = (await 신고.제목.innerText()).match(/#(\d+)/)?.[1] ?? '';
      await verify('계정 게시물에서 게시물을 골라 「신고」를 누르면 그 게시물이 든 신고 상세가 열린다', 열림, true);
    });
  } finally {
    try {
      if (신고번호) await 신고닫기(page, 신고번호);
    } finally {
      await qa_user2되돌리기(page);
    }
  }
});
