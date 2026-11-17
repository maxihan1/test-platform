import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로, 던전으로 } from './helpers/game-enter.helper.js';
import { 내체력이될때까지 } from './helpers/battle.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-101',
  name: '레벨 5 마법사가 「치유의 손길」로 회복하면 공격 배율 없이 체력이 250 오른다',
  platforms: ['android'],
  precondition: ['레벨 5 일반 회원이 마법사로 던전에 들어와 체력이 1 이다'],
  elements: ['class:mage', 'skill:healing_touch'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 레벨 5 마법사로 던전에 들어가 체력을 1 로 바꾼다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await GM(game, '/gm level 5');
      await 던전으로(game, 아이디, 비밀번호, 4);
      await GM(game, '/gm hp 1');
    });
    await test.step('체력이 1 인지 확인한다', async () => {
      await verify('체력이 1 이다', await 내체력이될때까지(game, 1, 10_000), 1, { blocker: true });
    });

    await test.step('「치유의 손길」로 나를 회복한다', async () => {
      await 던전화면.지금(game).누르기(던전화면.내초상화);
      await 던전화면.지금(game).누르기(던전화면.스킬1);
      await verify('레벨 5 마법사가 「치유의 손길」로 회복하면 공격 배율 없이 체력이 250 오른다', await 내체력이될때까지(game, 251), 251);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
