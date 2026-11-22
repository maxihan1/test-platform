import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정번호, 점검끄기, 점검바꾸기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-420',
  name: '점검 중에도 허용 계정으로 로그인하면 로비 화면이 열린다',
  platforms: ['windows'],
  precondition: ['일반 회원 계정이 허용 계정으로 든 점검이 켜져 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('점검 끄기', () => 점검끄기(admin));

  await test.step('일반 회원 계정이 허용 계정으로 든 점검을 켠다', async () => {
    const 번호 = await 계정번호(admin, 아이디);
    await 점검바꾸기(admin, { enabled: true, message: '[QA] 점검 안내 문구', allowedAccountIds: [번호] });
    await verify('일반 회원 계정 번호가 허용 계정에 들어 있다', 번호 > 0, true, { blocker: true });
  });

  await test.step('일반 회원으로 「게임 시작」을 누른다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('점검 중에도 허용 계정으로 로그인하면 로비 화면이 열린다', 로비 !== null, true);
  });
});
