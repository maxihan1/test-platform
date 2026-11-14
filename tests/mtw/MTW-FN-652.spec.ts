import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글경로, 글쓰기API, 글지우기API } from './helpers/api.helper.js';
import { 계정창열기 } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 개인멘션글화면 } from './pages/private-status.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-652',
  name: '언급되지 않은 사람이 개인 멘션 글 주소를 열면 본문이 보이지 않는다',
  precondition: ['일반 회원이 두 번째 사용자에게 보낸 개인 멘션 글이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
    adminId: z.string().describe('관리자 이메일').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 암호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  let 글번호 = '';
  let 본문조각 = '';
  let 경로 = '';

  try {
    await test.step('일반 회원이 두 번째 사용자에게 개인 멘션 글을 보낸다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      본문조각 = 표식('dm');
      const 글 = await 글쓰기API(page, { status: `@qa_user2 ${본문조각}`, visibility: 'direct' });
      글번호 = 글.id;
      경로 = 글경로(글);
      await verify('보낸 글의 공개 범위가 개인 멘션이다', 글.visibility, 'direct', { blocker: true });
    });

    await test.step('언급되지 않은 관리자로 그 글 주소를 연다', async () => {
      const 창 = await 계정창열기(page, params.adminId, params.adminPassword);
      try {
        const 열기 = new 개인멘션글화면(창.page);
        await 열기.열기(경로);
        const 보인다 = await 열기.본문(본문조각).waitFor({ timeout: 5_000 }).then(() => true, () => false);
        await verify('언급되지 않은 사람이 개인 멘션 글 주소를 열면 본문이 보이지 않는다', 보인다, false);
      } finally {
        await 창.창묶음.close();
      }
    });
  } finally {
    if (글번호 !== '') await 글지우기API(page, 글번호);
  }
});
