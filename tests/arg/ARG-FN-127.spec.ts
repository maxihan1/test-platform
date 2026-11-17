import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 골드가바뀔때까지, 보스방으로 } from './helpers/battle.helper.js';
import { 던전으로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기, 저장될때까지, 캐릭터 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-127',
  name: '장비 없이 보스 임프를 처치하면 골드가 200 오른다',
  platforms: ['android'],
  precondition: ['일반 회원이 던전 보스 방에 와 있다'],
  elements: ['flow:골드-보스처치', 'monster:imp_boss'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 골드 = async (): Promise<number> => Number((await new 공통HUD(game).골드글()).replace(/[^0-9]/g, ''));
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 던전 보스 방으로 간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호, 0);
      await 보스방으로(game);
    });
    let 화면전 = 0;
    let 서버전 = 0;
    await test.step('던전과 보유 골드를 확인한다', async () => {
      await verify('던전에 「공격」 버튼이 보인다', await 던전화면.지금(game).보이나(던전화면.공격), true, { blocker: true });
      화면전 = await 골드();
      서버전 = (await 캐릭터(admin, 아이디)).골드;
    });

    await test.step('GM 명령으로 보스 임프를 처치하고 골드를 읽는다', async () => {
      await GM(game, '/gm killboss');
      const 화면후 = await 골드가바뀔때까지(game, 화면전);
      const 화면 = await verify('상단 바 골드가 200 오른다', 화면후 - 화면전, 200);
      const 서버 = await 저장될때까지(admin, 아이디, (값) => 값.골드 === 서버전 + 200);
      const 저장 = await verify('서버에 저장된 골드가 200 오른다', 서버.골드 - 서버전, 200);
      await verify('장비 없이 보스 임프를 처치하면 골드가 200 오른다', 화면 && 저장, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
