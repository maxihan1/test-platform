import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방개수가될때까지, 가방화면개수, 가방화면줄수, 서버아이템개수, 서버아이템합, 임프하나만두기, 처치수가오를때까지 } from './helpers/battle.helper.js';
import { 던전으로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기, 상태읽기, 저장될때까지 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-125',
  name: '「임프의 뿔」 확률을 100% 로 두고 임프를 처치하면 가방에 「임프의 뿔」이 1개 는다',
  platforms: ['android'],
  precondition: ['전리품을 「임프의 뿔」로 고정한 일반 회원이 던전에서 임프 하나를 불러냈다', '전리품이 나오지 않게 고정한 일반 회원이 던전에서 임프 하나를 불러냈다'],
  techniques: ['경계값 분석'],
  elements: ['item:imp_horn', 'rate:imp_horn'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 던전에서 임프 하나를 불러낸다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호, 0);
      await 임프하나만두기(game);
    });
    await test.step('던전과 임프를 확인한다', async () => {
      await verify('던전에 임프가 보인다', await 던전화면.지금(game).보이나(던전화면.임프), true, { blocker: true });
    });

    let 뿔전 = 0;
    await test.step('전리품을 「임프의 뿔」로 고정하고 가방의 「임프의 뿔」 개수를 읽어 둔다', async () => {
      await GM(game, '/gm loot 임프의 뿔');
      뿔전 = await 가방화면개수(game, '임프의 뿔');
    });
    await test.step('임프를 처치한다', async () => {
      await GM(game, '/gm killall');
      const 뿔후 = await 가방개수가될때까지(game, '임프의 뿔', 뿔전 + 1);
      const 화면 = await verify('가방 창의 「임프의 뿔」이 1개 늘어난다', 뿔후, 뿔전 + 1);
      const 서버 = await 저장될때까지(admin, 아이디, (값) => 서버아이템개수(값.items, '임프의 뿔') === 뿔전 + 1);
      const 저장 = await verify('서버에 저장된 「임프의 뿔」이 1개 늘어난다', 서버아이템개수(서버.items, '임프의 뿔'), 뿔전 + 1);
      await verify('「임프의 뿔」 확률을 100% 로 두고 임프를 처치하면 가방에 「임프의 뿔」이 1개 는다', 화면 && 저장, true);
    });

    let 줄전 = 0;
    let 합전 = 0;
    let 처치전 = 0;
    await test.step('전리품이 나오지 않게 고정하고 임프 하나를 불러낸 뒤 가방의 아이템 수를 읽어 둔다', async () => {
      await GM(game, '/gm loot none');
      await 임프하나만두기(game);
      줄전 = await 가방화면줄수(game);
      합전 = 서버아이템합((await 저장될때까지(admin, 아이디, () => false, 10_000)).items);
      처치전 = Number((await 상태읽기(game, true))['처치']);
    });
    await test.step('전리품 없음으로 고정한 채 임프를 처치한다', async () => {
      await GM(game, '/gm killall');
      await 처치수가오를때까지(game, 처치전);
      const 줄후 = await verify('가방 창의 아이템 줄 수가 그대로다', await 가방화면줄수(game), 줄전);
      const 합후 = await verify('서버에 저장된 아이템 수가 그대로다', 서버아이템합((await 저장될때까지(admin, 아이디, () => false, 10_000)).items), 합전);
      await verify('전리품 확률이 0% 일 때는 가방의 아이템 수가 그대로다', 줄후 && 합후, true);
    });
  } finally {
    await GM(game, '/gm loot off');
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
