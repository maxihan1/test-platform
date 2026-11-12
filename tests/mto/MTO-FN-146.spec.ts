import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 만든신고, 신고들만들기, 신고정리 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 신고상세화면 } from './pages/report-detail.page.js';
import { 신고목록화면 } from './pages/report-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-146',
  name: 'Owner 가 신고 줄을 누르면 신고 상세 제목 「신고 #N」이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 만든 qa_user2 신고가 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    userId: z.string().describe('신고자 아이디').optional().meta({ secret: true, account: '사용자' }),
    userPassword: z.string().describe('신고자 비밀번호').optional().meta({ secret: true, account: '사용자' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 신고 = new 신고상세화면(page);
  const 목록 = new 신고목록화면(page);
  let 신고들: 만든신고[] = [];
  let 번호 = '';
  let 사유 = '';

  try {
    await test.step('신고자 qa_user1 로 qa_user2 신고를 만든다', async () => {
      신고들 = await 신고들만들기(page, params.userId, params.userPassword, 1, { 게시물: '없음' });
      번호 = 신고들[0]?.번호 ?? '';
      사유 = 신고들[0]?.사유 ?? '';
    });

    await test.step('Owner 계정으로 로그인해 「신고」 목록을 연다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 목록.열기();
      await verify('케이스가 만든 qa_user2 신고가 있다', await 목록.사유링크(사유).isVisible(), true, { blocker: true });
    });

    await test.step('「신고」 목록에서 그 신고 줄을 누른다', async () => {
      await 목록.사유링크(사유).click();
      await 신고.제목.waitFor();
      await verify('Owner 가 신고 줄을 누르면 신고 상세 제목 「신고 #N」이 보인다', (await 신고.제목.innerText()).trim(), `신고 #${번호}`);
    });
  } finally {
    await 신고정리(page, 신고들.map((항목) => 항목.번호), params.loginId, params.loginPassword, false);
  }
});
