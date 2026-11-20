import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비접속인원글이될때까지 } from './helpers/login-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 접속자, 봇모두끄기, 봇켜기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-002',
  name: '일반 회원으로 로그인하면 로비 접속 인원에 두 번째 플레이어까지 세어 「2명 접속 중」이 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어가 봇으로 로비에 접속해 있다'],
  elements: ['state:장소=로비'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 둘째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 두 계정 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 둘째);
  });
  await test.step('두 번째 플레이어를 봇으로 로비에 접속시킨다', async () => {
    await 봇켜기(admin, 둘째);
    const 접속 = (await 접속자(admin)).players.some((줄) => 줄.user === 둘째.아이디);
    await verify('두 번째 플레이어가 로비에 접속해 있다', 접속, true, { blocker: true });
  });
  await test.step('일반 회원 계정으로 로그인한다', async () => {
    await 로비로(game, driver, 나);
    const 맞음 = await 로비접속인원글이될때까지(game, '2명 접속 중');
    await verify('일반 회원으로 로그인하면 로비 접속 인원에 두 번째 플레이어까지 세어 「2명 접속 중」이 보인다', 맞음, true);
  });
});
