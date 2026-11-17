import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 봇과같이던전으로, 임프에게맞은피해읽기, 임프하나만두고레벨맞추기, 장비받아끼기 } from './helpers/battle.helper.js';
import { 계정되돌리기, 봇끄기, 봇켜기, 접속자 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-104',
  name: '레벨 5 탱커가 「사슬 갑옷」을 입고 임프에게 맞으면 받은 피해가 12 다',
  platforms: ['android'],
  precondition: ['레벨 5 일반 회원이 「사슬 갑옷」을 입고 두 번째 · 세 번째 플레이어 봇과 셋이 탱커로 던전에서 임프 하나를 불러냈다'],
  elements: ['item:chain_armor', 'monster:imp'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    secondPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    thirdId: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    thirdPassword: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 둘째아이디 = params.secondId ?? '';
  const 둘째비밀번호 = params.secondPassword ?? '';
  const 셋째아이디 = params.thirdId ?? '';
  const 셋째비밀번호 = params.thirdPassword ?? '';
  try {
    let 장착글 = '';
    await test.step('세 계정을 처음 상태로 되돌리고 일반 회원이 로비에서 「사슬 갑옷」을 받아 입는다', async () => {
      await 봇끄기(admin);
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 계정되돌리기(admin, 둘째아이디, 둘째비밀번호, 'base');
      await 계정되돌리기(admin, 셋째아이디, 셋째비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      장착글 = await 장비받아끼기(game, admin, 아이디, '사슬 갑옷', '갑옷');
    });
    await test.step('갑옷 칸을 확인한다', async () => {
      await verify('갑옷 칸에 「사슬 갑옷」이 보인다', 장착글.includes('사슬 갑옷'), true, { blocker: true });
    });

    await test.step('두 번째 · 세 번째 플레이어 봇과 셋이 던전에 들어가 임프 하나를 불러내고 레벨을 5 로 바꾼다', async () => {
      await 봇과같이던전으로(game, admin, { 아이디, 비밀번호 }, { 아이디: 둘째아이디, 비밀번호: 둘째비밀번호 });
      await 봇켜기(admin, { user: 셋째아이디, pass: 셋째비밀번호 });
      await 임프하나만두고레벨맞추기(game, 5);
    });
    await test.step('던전에 셋이 있는지 확인한다', async () => {
      const 접속 = (await 접속자(admin)).players.map((사람) => 사람.user);
      await verify('접속해 있는 플레이어가 3명이다', 접속.filter((이름) => [아이디, 둘째아이디, 셋째아이디].includes(이름)).length, 3, { blocker: true });
      await verify('던전에 임프가 보인다', await 던전화면.지금(game).보이나(던전화면.임프), true, { blocker: true });
    });

    await test.step('무적을 끄고 임프에게 맞는다', async () => {
      await verify('레벨 5 탱커가 「사슬 갑옷」을 입고 임프에게 맞으면 받은 피해가 12 다', await 임프에게맞은피해읽기(game), 12);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째아이디, 둘째비밀번호, 'base');
    await 계정되돌리기(admin, 셋째아이디, 셋째비밀번호, 'base');
  }
});
