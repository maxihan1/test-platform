import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호, 신고만들기, 신고보내기 } from './helpers/api.helper.js';
import { 신고정리 } from './helpers/report-data.helper.js';
import { 로그인하기, 새창으로로그인 } from './helpers/login.helper.js';
import { 신고상세화면 } from './pages/report-detail.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-152',
  name: '사유를 1,000자로 적어 신고를 만들면 상세에 그 사유가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '신고자 qa_user1 이 qa_user2 를 신고할 수 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    userId: z.string().describe('신고자 아이디').optional().meta({ secret: true, account: '사용자' }),
    userPassword: z.string().describe('신고자 비밀번호').optional().meta({ secret: true, account: '사용자' }),
    사유길이안: z.number().int().min(1).max(1000).describe('안쪽 시험 값 — 신고 사유 글자 수, 1 이상 1,000 이하').default(1000),
    사유길이밖: z.number().int().min(1001).describe('바깥 시험 값 — 신고 사유 글자 수, 1,001 이상').default(1001),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 신고 = new 신고상세화면(page);
  const 안쪽사유 = '가'.repeat(params.사유길이안);
  const 바깥사유 = '가'.repeat(params.사유길이밖);
  let 번호 = '';

  try {
    await test.step('Owner 계정으로 로그인하고 신고자 계정으로 qa_user2 를 찾는다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      const 신고자 = await 새창으로로그인(page, params.userId, params.userPassword);
      let 찾음 = false;
      try {
        찾음 = (await 계정번호(신고자, 'qa_user2')) !== '';
      } finally {
        await 신고자.context().close();
      }
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', !new 로그인화면(page).로그인화면인가(), true, { blocker: true });
      await verify('신고자 qa_user1 이 qa_user2 를 신고할 수 있다', 찾음, true, { blocker: true });
    });

    await test.step('사유를 1,000자로 적어 신고를 만들고 그 신고 상세를 연다', async () => {
      const 신고자 = await 새창으로로그인(page, params.userId, params.userPassword);
      try {
        번호 = await 신고만들기(신고자, 'qa_user2', { 게시물: '없음', 사유: 안쪽사유 });
      } finally {
        await 신고자.context().close();
      }
      await 신고.열기(번호);
      await verify('사유를 1,000자로 적어 신고를 만들면 상세에 그 사유가 보인다', await 신고.사유글(안쪽사유).isVisible(), true);
    });

    await test.step('사유를 1,001자로 적어 신고를 보낸다', async () => {
      const 신고자 = await 새창으로로그인(page, params.userId, params.userPassword);
      let 상태 = 0;
      try {
        상태 = await 신고보내기(신고자, 'qa_user2', 바깥사유);
      } finally {
        await 신고자.context().close();
      }
      await verify('1,001자 사유의 신고는 만들어지지 않는다', 상태 >= 400, true);
    });
  } finally {
    await 신고정리(page, 번호 ? [번호] : [], params.loginId, params.loginPassword, false);
  }
});
