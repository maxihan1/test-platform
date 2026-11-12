import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 이의제기화면 } from './pages/appeals.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-476',
  name: '승인된 이의제기가 없을 때 「승인됨」을 누르면 「이의제기 없음.」이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '승인된 이의제기가 없다', '대기 중 이의제기(troll_kim)가 1건 이상 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 화면 = new 이의제기화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 화면.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 화면.제목.isVisible(), true, { blocker: true });
    await verify('대기 중 이의제기(troll_kim)가 1건 이상 있다', (await 화면.줄('troll_kim').count()) > 0, true, { blocker: true });
  });

  await test.step('「이의제기」 화면에서 「승인됨」을 누른다', async () => {
    await 화면.승인됨누르기();
    await verify('승인된 이의제기가 없을 때 「승인됨」을 누르면 「이의제기 없음.」이 보인다', await 화면.비어있음.isVisible(), true);
  });

  await test.step('「이의제기」 화면을 연다', async () => {
    await 화면.열기();
    const 줄 = await verify('목록에 그 줄이 1건 이상 보인다', (await 화면.줄('troll_kim').count()) > 0, true);
    const 없음 = await verify('「이의제기 없음.」이 보이지 않는다', await 화면.비어있음.isVisible(), false);
    await verify('대기 중 이의제기 목록에는 줄이 1건 이상 보이고 「이의제기 없음.」이 보이지 않는다', 줄 && 없음, true);
  });
});
