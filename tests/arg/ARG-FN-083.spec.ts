import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 둘이서던전으로, 공격버튼역할기다려읽기 } from './helpers/battle.helper.js';
import { 계정되돌리기, 봇끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-083',
  name: '살아 있는 플레이어를 고르면 「부활」 버튼이 눌리지 않는 상태다',
  platforms: ['android'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 함께 던전에 있다'],
  techniques: ['결정 테이블', '상태 전이'],
  elements: ['state:생존=살아 있음'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    secondPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 둘째아이디 = params.secondId ?? '';
  const 둘째비밀번호 = params.secondPassword ?? '';
  try {
    await test.step('두 계정을 처음 상태로 되돌리고 봇과 함께 던전에 들어간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 계정되돌리기(admin, 둘째아이디, 둘째비밀번호, 'base');
      await 둘이서던전으로(game, admin, { 아이디, 비밀번호 }, { 아이디: 둘째아이디, 비밀번호: 둘째비밀번호 });
    });
    await test.step('던전에 두 번째 플레이어가 있는지 확인한다', async () => {
      await verify('던전 파티 초상화에 두 번째 플레이어가 보인다', await 던전화면.지금(game).뜰때까지(던전화면.아군초상화), true, { blocker: true });
    });

    await test.step('살아 있는 두 번째 플레이어를 고르고 「부활」 버튼 상태를 읽는다', async () => {
      const 화면 = 던전화면.지금(game);
      await 화면.누르기(던전화면.아군초상화);
      await 공격버튼역할기다려읽기(game, '부활');
      await verify('살아 있는 플레이어를 고르면 「부활」 버튼이 눌리지 않는 상태다', await 화면.버튼눌림(던전화면.공격), false);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째아이디, 둘째비밀번호, 'base');
  }
});
