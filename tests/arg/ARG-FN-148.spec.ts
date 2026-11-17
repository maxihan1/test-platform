import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 상태읽기 } from './helpers/game-state.helper.js';
import { 상점에서사기, 가방에서장착, 우편넣기, 우편받기 } from './helpers/economy.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-148',
  name: '「녹슨 단검」을 장착하면 공격 배율이 바로 1.05 가 된다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['item:rusty_dagger', 'item:leather_armor', 'item:lucky_ring', 'item:sage_necklace'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 장비를 받아 「현자의 목걸이」를 산다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-FN-148', [{ 이름: '녹슨 단검', 개수: 1 }, { 이름: '가죽 갑옷', 개수: 1 }, { 이름: '행운의 반지', 개수: 1 }], 100);
      await 로비로(game, 아이디, 비밀번호);
      await 우편받기(game, 'ARG-FN-148');
      await 상점에서사기(game, ['현자의 목걸이']);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('「녹슨 단검」을 장착하고 능력치를 읽는다', async () => {
      await 가방에서장착(game, '녹슨 단검');
      const 상태 = await 상태읽기(game);
      await verify('「녹슨 단검」을 장착하면 공격 배율이 바로 1.05 가 된다', Number(상태['공격배율']), 1.05);
    });
    await test.step('「가죽 갑옷」을 장착하고 능력치를 읽는다', async () => {
      await 가방에서장착(game, '가죽 갑옷');
      const 상태 = await 상태읽기(game);
      await verify('「가죽 갑옷」을 장착한 뒤 방어율이 바로 0.08 이다', Number(상태['방어율']), 0.08);
    });
    await test.step('「행운의 반지」를 장착하고 능력치를 읽는다', async () => {
      await 가방에서장착(game, '행운의 반지');
      const 상태 = await 상태읽기(game);
      await verify('「행운의 반지」를 장착한 뒤 골드 배율이 바로 1.2 다', Number(상태['골드배율']), 1.2);
    });
    await test.step('「현자의 목걸이」로 바꿔 끼고 능력치를 읽는다', async () => {
      await 가방에서장착(game, '현자의 목걸이');
      const 상태 = await 상태읽기(game);
      const 경험 = await verify('경험치 배율이 1.2 이다', Number(상태['경험치배율']), 1.2);
      const 골드 = await verify('골드 배율이 1 이다', Number(상태['골드배율']), 1);
      await verify('「현자의 목걸이」로 바꿔 낀 뒤 경험치 배율이 1.2 이고 골드 배율은 1 로 돌아간다', 경험 && 골드, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
