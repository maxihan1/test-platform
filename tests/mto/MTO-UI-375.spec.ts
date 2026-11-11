import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 만든신고, 신고들만들기, 신고정리 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 신고상세화면 } from './pages/report-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-375',
  name: '신고 상세 헤더에 「신고 대상 계정」 · 「신고자」 · 「신고 시각」 · 「업데이트 시각」 · 「할당된 중재자」 「아무도 없음」 · 「나에게 할당하기」가 보인다',
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

    await test.step('그 신고 상세를 연다', async () => {
      await 신고.열기(번호);
      const 대상 = await verify('「신고 대상 계정」이 보인다', await 신고.신고대상계정라벨.isVisible(), true);
      const 신고자 = await verify('「신고자」가 보인다', await 신고.신고자라벨.isVisible(), true);
      const 신고시각 = await verify('「신고 시각」이 보인다', await 신고.신고시각라벨.isVisible(), true);
      const 업데이트 = await verify('「업데이트 시각」이 보인다', await 신고.업데이트시각라벨.isVisible(), true);
      const 중재자 = await verify('「할당된 중재자」가 보인다', await 신고.할당된중재자라벨.isVisible(), true);
      const 아무도 = await verify('「아무도 없음」이 보인다', await 신고.아무도없음.isVisible(), true);
      const 할당 = await verify('「나에게 할당하기」가 보인다', await 신고.나에게할당하기.isVisible(), true);
      await verify('신고 상세 헤더에 「신고 대상 계정」 · 「신고자」 · 「신고 시각」 · 「업데이트 시각」 · 「할당된 중재자」 「아무도 없음」 · 「나에게 할당하기」가 보인다', 대상 && 신고자 && 신고시각 && 업데이트 && 중재자 && 아무도 && 할당, true);
    });
  } finally {
    await 신고정리(page, 신고들.map((항목) => 항목.번호), params.loginId, params.loginPassword, false);
  }
});
