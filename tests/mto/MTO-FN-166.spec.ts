import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 만든신고, 신고들만들기, 신고정리 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 감사로그화면 } from './pages/action-logs.page.js';
import { 신고상세화면 } from './pages/report-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-166',
  name: '신고 상세에서 「나에게 할당하기」를 누르면 「할당된 중재자」에 qa_admin 이 보이고 버튼이 「할당 해제」로 바뀐다',
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
  const 로그 = new 감사로그화면(page);
  let 신고들: 만든신고[] = [];
  let 번호 = '';

  try {
    await test.step('신고자 qa_user1 로 qa_user2 신고를 만든다', async () => {
      신고들 = await 신고들만들기(page, params.userId, params.userPassword, 1, { 게시물: '없음' });
      번호 = 신고들[0]?.번호 ?? '';
    });

    await test.step('Owner 계정으로 로그인해 그 신고 상세를 연다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 신고.열기(번호);
      await verify('케이스가 만든 qa_user2 신고가 있다', await 신고.해결로표시.isVisible(), true, { blocker: true });
    });

    await test.step('신고 상세에서 「나에게 할당하기」를 누른다', async () => {
      await 신고.나에게할당();
      const 이름 = await verify('「할당된 중재자」에 qa_admin 이 보인다', await 신고.할당자('qa_admin').isVisible(), true);
      const 버튼 = await verify('버튼이 「할당 해제」로 바뀐다', await 신고.할당해제.isVisible(), true);
      await verify('신고 상세에서 「나에게 할당하기」를 누르면 「할당된 중재자」에 qa_admin 이 보이고 버튼이 「할당 해제」로 바뀐다', 이름 && 버튼, true);
    });

    await test.step('할당한 신고에서 「할당 해제」를 누르고 「감사 로그」를 연다', async () => {
      await 신고.할당풀기();
      const 아무도 = await verify('「할당된 중재자」가 「아무도 없음」으로 돌아간다', await 신고.아무도없음.isVisible(), true);
      await 로그.열기();
      const 기록 = await verify('감사 로그에 할당 기록이 보인다', (await 로그.로그줄.filter({ hasText: new RegExp(`신고 #${번호}\\D.*할당`) }).count()) > 0, true);
      await verify('「할당 해제」 뒤에는 「할당된 중재자」가 「아무도 없음」으로 돌아가고 감사 로그에 할당 기록이 보인다', 아무도 && 기록, true);
    });
  } finally {
    await 신고정리(page, 신고들.map((항목) => 항목.번호), params.loginId, params.loginPassword, false);
  }
});
