import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/api.helper.js';
import { type 만든신고, 신고들만들기, 신고정리 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 조치화면 } from './pages/account-action.page.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 신고상세화면 } from './pages/report-detail.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-162',
  name: '이미 제한된 계정의 신고 상세를 열면 「제한」이 눌리지 않는다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', 'qa_user2 가 케이스 안에서 제한돼 있다', '케이스가 만든 qa_user2 신고가 있다'],
  techniques: ['결정 테이블'],
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
  const 상세 = new 계정상세화면(page);
  const 조치 = new 조치화면(page);
  let 신고들: 만든신고[] = [];
  let 번호 = '';
  let 계정 = '';

  try {
    await test.step('Owner 계정으로 로그인해 qa_user2 를 제한한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      계정 = await 계정번호(page, 'qa_user2');
      await 조치.열기(계정, 'silence');
      await 조치.조치하기('제한', false);
    });

    await test.step('qa_user2 가 제한돼 있는지 확인한다', async () => {
      await 상세.열기(계정);
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', !new 로그인화면(page).로그인화면인가(), true, { blocker: true });
      await verify('qa_user2 가 케이스 안에서 제한돼 있다', await 상세.제한해제.isVisible(), true, { blocker: true });
    });

    await test.step('신고자 qa_user1 로 qa_user2 신고를 만든다', async () => {
      신고들 = await 신고들만들기(page, params.userId, params.userPassword, 1, { 게시물: '없음' });
      번호 = 신고들[0]?.번호 ?? '';
    });

    await test.step('만든 신고가 열려 있는지 확인한다', async () => {
      await 신고.열기(번호);
      await verify('케이스가 만든 qa_user2 신고가 있다', await 신고.해결로표시.isVisible(), true, { blocker: true });
    });

    await test.step('그 신고 상세를 연다', async () => {
      await 신고.열기(번호);
      await 신고.조치영역.waitFor();
      await verify('이미 제한된 계정의 신고 상세를 열면 「제한」이 눌리지 않는다', await 신고.제한.isDisabled(), true);
    });
  } finally {
    await 신고정리(page, 신고들.map((항목) => 항목.번호), params.loginId, params.loginPassword, true);
  }
});
