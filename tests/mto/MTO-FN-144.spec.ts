import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 신고목록화면 } from './pages/report-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-144',
  name: '신고 목록에서 「해결」을 누르면 해결된 scam_park · promo_lee 신고가 보이고 미해결 spam_shop 카드는 보이지 않는다',
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

  await test.step('「신고」 화면에서 상태 필터 「해결」을 누른다', async () => {
    await 목록.필터누르기(목록.해결, '해결');
    const 스팸카드 = await verify('미해결 spam_shop 카드는 보이지 않는다', await 목록.카드('spam_shop').isVisible(), false);
    const 사기 = await verify('해결된 scam_park 신고가 보인다', await 목록.해결카드찾기('scam_park'), true);
    const 홍보 = await verify('해결된 promo_lee 신고가 보인다', await 목록.해결카드찾기('promo_lee'), true);
    await verify('신고 목록에서 「해결」을 누르면 해결된 scam_park · promo_lee 신고가 보이고 미해결 spam_shop 카드는 보이지 않는다', 스팸카드 && 사기 && 홍보, true);
  });
});
