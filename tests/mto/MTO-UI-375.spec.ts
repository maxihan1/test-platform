import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 만든신고, 신고들만들기, 신고정리 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 신고상세화면 } from './pages/report-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-375',
  name: '신고 상세 헤더의 신고 대상 계정 카드에 「프로필 보기」 · 「가입 날짜」 · 「최근 활동」 · 「이전의 처벌들」이 보인다',
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
      const 프로필 = await verify('「프로필 보기」가 보인다', await 신고.프로필보기.isVisible(), true);
      const 카드항목 = await verify('「가입 날짜」 · 「최근 활동」 · 「이전의 처벌들」이 보인다', (await 신고.계정카드라벨들.allInnerTexts()).join(', '), '가입 날짜, 최근 활동, 이전의 처벌들');
      await verify('신고 상세 헤더의 신고 대상 계정 카드에 「프로필 보기」 · 「가입 날짜」 · 「최근 활동」 · 「이전의 처벌들」이 보인다', 프로필 && 카드항목, true);
      const 머리항목 = await verify('「신고 시각」 · 「신고자」 · 「상태」 · 「할당된 중재자」가 보인다', (await 신고.신고머리라벨들.allInnerTexts()).join(', '), '신고 시각, 신고자, 상태, 할당된 중재자');
      const 아무도 = await verify('「아무도 없음」이 보인다', await 신고.아무도없음.isVisible(), true);
      const 할당 = await verify('「나에게 할당하기」가 보인다', await 신고.나에게할당하기.isVisible(), true);
      await verify('신고 상세 헤더에 「신고 시각」 · 「신고자」 · 「상태」 · 「할당된 중재자」 「아무도 없음」 · 「나에게 할당하기」가 보인다', 머리항목 && 아무도 && 할당, true);
    });
  } finally {
    await 신고정리(page, 신고들.map((항목) => 항목.번호), params.loginId, params.loginPassword, false);
  }
});
