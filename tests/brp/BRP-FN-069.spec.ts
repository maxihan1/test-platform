import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창 } from './components/popup.component.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 점검끄기, 점검바꾸기, 캐릭터값기다리기 } from './helpers/game-state.helper.js';
import { GM골드 } from './helpers/gm.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-069',
  name: '골드를 바꾼 직후 점검으로 내보내지면 운영 API 의 캐릭터 골드가 1468 이다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('점검을 끄고 일반 회원을 기준 상태로 되돌리기', async () => {
    await 점검끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  });

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('GM 명령으로 골드를 1468 로 바꾸고 바로 허용 계정 없는 점검을 켠다', async () => {
    await GM골드(game, 1468);
    await 점검바꾸기(admin, { enabled: true, message: '[QA] 점검 안내 문구', allowedAccountIds: [] });
    await verify('점검으로 내보내져 안내 창이 뜬다', await new 안내창(game).뜰때까지(60_000), true, { blocker: true });
    const 값 = await 캐릭터값기다리기(admin, 아이디, (c) => c.gold === 1468, 25_000);
    await verify('골드를 바꾼 직후 점검으로 내보내지면 운영 API 의 캐릭터 골드가 1468 이다', 값.gold, 1468);
  });
});
