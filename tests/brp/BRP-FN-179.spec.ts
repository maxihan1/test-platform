import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 가방요약 } from './helpers/items.helper.js';
import { 계정되돌리기, 로비로되돌리기, 봇기록기다리기, 봇시키기, 봇켜기, 줄글 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-179',
  name: '물약을 장착하려 하면 오류 알림 「장착할 수 없는 아이템입니다」가 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있고 가방이 기준 상태(체력 물약 3)다'],
  techniques: ['동등 분할', '상태 전이'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  const 봇아이디 = params.p2Id ?? '';
  const 봇비밀번호 = params.p2Password ?? '';
  await test.cleanup('봇을 끄고 방을 로비로 돌린 뒤 두 계정을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 봇아이디, 봇비밀번호, 'base');
  });

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('가방이 기준 상태인 것을 확인한다', async () => {
    await verify('가방에 체력 물약 3개만 있다', await 가방요약(game), '체력 물약 x3', { blocker: true });
  });

  await test.step('두 번째 플레이어 봇에게 체력 물약 장착을 보내게 하고 봇 기록을 읽는다', async () => {
    const 봇 = await 봇켜기(admin, 봇아이디, 봇비밀번호);
    await 봇시키기(admin, 봇, 'equip:체력 물약');
    const 줄 = await 봇기록기다리기(admin, 봇, (칸) => 줄글(칸).includes('장착할 수 없는 아이템입니다'));
    await verify('물약을 장착하려 하면 오류 알림 「장착할 수 없는 아이템입니다」가 뜬다', 줄 !== null, true);
  });
});
