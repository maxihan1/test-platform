import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 신고목록화면 } from './pages/report-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-145',
  name: '신고 목록에서 「해결」과 「로컬」을 차례로 누르면 주소에 두 조건이 함께 붙고 해결된 로컬 신고가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 신고목록화면(page);

  await test.step('Owner 계정으로 로그인하고 「신고」 화면을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 목록.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('「신고」 화면에서 「해결」을 누른 뒤 「로컬」을 누른다', async () => {
    await 목록.필터누르기(목록.해결, '해결');
    await 목록.필터누르기(목록.로컬, '로컬');
    const 해결조건 = await verify('주소에 해결 조건이 붙는다', 목록.주소조건('resolved'), '1');
    const 로컬조건 = await verify('주소에 로컬 조건이 붙는다', 목록.주소조건('target_origin'), 'local');
    const 로컬신고 = await verify('해결된 로컬 신고가 보인다', await 목록.해결카드찾기('scam_park', 'target_origin=local'), true);
    await verify('신고 목록에서 「해결」과 「로컬」을 차례로 누르면 주소에 두 조건이 함께 붙고 해결된 로컬 신고가 보인다', 해결조건 && 로컬조건 && 로컬신고, true);
  });
});
