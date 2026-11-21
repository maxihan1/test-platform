import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 신고상세화면 } from './pages/report-detail.page.js';
import { 신고목록화면 } from './pages/report-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-124',
  name: '해결된 신고 상세 헤더에 「할당된 중재자」 대신 「신고 처리자」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '해결된 시드 신고(scam_park)가 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 신고 = new 신고상세화면(page);
  const 목록 = new 신고목록화면(page);

  await test.step('Owner 계정으로 로그인하고 해결된 신고 목록을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 목록.열기('resolved=1');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
    await verify('해결된 시드 신고(scam_park)가 있다', await 목록.해결카드찾기('scam_park'), true, { blocker: true });
  });

  await test.step('해결된 scam_park 신고 상세를 연다', async () => {
    await 목록.신고링크('scam_park').click();
    await 신고.제목.waitFor();
    const 처리자 = await verify('「신고 처리자」가 보인다', await 신고.신고처리자라벨.isVisible(), true);
    const 중재자 = await verify('「할당된 중재자」가 보이지 않는다', await 신고.할당된중재자라벨.isVisible(), false);
    await verify('해결된 신고 상세 헤더에 「할당된 중재자」 대신 「신고 처리자」가 보인다', 처리자 && 중재자, true);
  });
});
