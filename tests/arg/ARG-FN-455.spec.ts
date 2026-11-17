import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 로비로 } from './helpers/game-enter.helper.js';
import { 임프에게맞은피해읽기, 임프하나만두고레벨맞추기, 장비받아끼기 } from './helpers/battle.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-455',
  name: '레벨 30 탱커가 「사슬 갑옷」을 입고 혼자 임프에게 맞으면 받은 피해가 최솟값 5 다',
  platforms: ['android'],
  precondition: ['레벨 30 일반 회원이 「사슬 갑옷」을 입고 탱커로 혼자 던전에서 임프 하나를 불러냈다'],
  techniques: ['경계값 분석'],
  elements: ['item:chain_armor', 'monster:imp'],
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
    let 장착글 = '';
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로비에서 「사슬 갑옷」을 받아 입는다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      장착글 = await 장비받아끼기(game, admin, 아이디, '사슬 갑옷', '갑옷');
    });
    await test.step('갑옷 칸을 확인한다', async () => {
      await verify('갑옷 칸에 「사슬 갑옷」이 보인다', 장착글.includes('사슬 갑옷'), true, { blocker: true });
    });

    await test.step('탱커로 혼자 던전에 들어가 임프 하나를 불러내고 레벨을 30 으로 바꾼다', async () => {
      await 던전으로(game, 아이디, 비밀번호, 0);
      await 임프하나만두고레벨맞추기(game, 30);
    });
    await test.step('던전과 임프를 확인한다', async () => {
      await verify('던전에 임프가 보인다', await 던전화면.지금(game).보이나(던전화면.임프), true, { blocker: true });
    });

    await test.step('무적을 끈 채 임프에게 맞는다', async () => {
      await verify('레벨 30 탱커가 「사슬 갑옷」을 입고 혼자 임프에게 맞으면 받은 피해가 최솟값 5 다', await 임프에게맞은피해읽기(game), 5);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
