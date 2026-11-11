import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 이의제기화면 } from './pages/appeals.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-149',
  name: '이의제기 목록의 troll_kim 행에 처벌 내용 · 날짜 · 「이의제기 대기중」이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '대기 중 이의제기(troll_kim)가 1건 이상 있다'],
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

  await test.step('「이의제기」 화면을 연다', async () => {
    await 화면.열기();
    const 내용 = await verify('처벌 내용이 보인다', await 화면.처벌내용('troll_kim').isVisible(), true);
    const 날짜 = await verify('날짜가 보인다', await 화면.날짜('troll_kim').isVisible(), true);
    const 대기 = await verify('「이의제기 대기중」이 보인다', await 화면.대기표시('troll_kim').isVisible(), true);
    await verify('이의제기 목록의 troll_kim 행에 처벌 내용 · 날짜 · 「이의제기 대기중」이 보인다', 내용 && 날짜 && 대기, true);
  });
});
