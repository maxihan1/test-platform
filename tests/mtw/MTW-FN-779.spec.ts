import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정설정화면 } from './pages/account-settings.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-779',
  name: '초대 「주석」에 420자를 넣으면 다 들어간다',
  precondition: ['일반 회원으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    주석한도: z.number().describe('초대 주석 글자 수 한도').default(420),
  }),
});
test(spec, async ({ page, params, expected }) => {
  const 설정 = new 계정설정화면(page);
  const 넣고길이 = async (수: number): Promise<number> => {
    const 칸 = 설정.칸('주석');
    if (!(await 칸.waitFor({ timeout: 5_000 }).then(() => true, () => false))) return -1;
    await 칸.fill('가'.repeat(수));
    return (await 칸.inputValue()).length;
  };

  await test.step('일반 회원으로 로그인하고 초대 화면을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 설정.열기('/invites');
    await verify('초대 화면에 「초대 링크 생성하기」가 보인다', await 설정.버튼('초대 링크 생성하기').isVisible(), true, { blocker: true });
  });

  await test.step('초대 「주석」에 420자를 넣는다', async () => {
    await verify('초대 「주석」에 420자를 넣으면 다 들어간다', await 넣고길이(expected.주석한도), expected.주석한도);
  });

  await test.step('초대 「주석」에 421자를 넣는다', async () => {
    await verify('421자 주석은 420자까지만 받는다', await 넣고길이(expected.주석한도 + 1), expected.주석한도);
  });
});
