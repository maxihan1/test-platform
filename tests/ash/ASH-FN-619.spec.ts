import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내띠 } from './components/toast.component.js';
import { 계정지우기, 바꾸기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 월드에들어가기 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-619',
  name: '골드가 모자라 사지 못하면 「골드가 부족합니다.」 같은 한국어 안내가 보인다',
  platforms: ['android'],
  precondition: ['새 캐릭터로 월드에 들어가 골드가 0 이다'],
  held: '보류 — 게임 창을 못 엶(상점)',
  elements: ['npc:상인', 'flow:골드-상점구매'],
  params: z.object({
    입장버튼: z.string().describe('월드 입장 버튼 오브젝트 주소 — 게임 화면에서 읽는다'),
    월드화면: z.string().describe('월드 화면 오브젝트 주소 — 게임 화면에서 읽는다'),
    상점열기버튼: z.string().describe('상점 열기 버튼 오브젝트 주소 — 게임 화면에서 읽는다'),
    구매버튼: z.string().describe('살 물건의 구매 버튼 오브젝트 주소 — 게임 화면에서 읽는다'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('골드가 0 인 새 캐릭터로 월드에 들어간다', async () => {
      나 = await 새캐릭터(admin, 'zqa619');
      await 바꾸기(admin, 나, { gold: 0 });
      await 월드에들어가기(game, 나, params.입장버튼, params.월드화면);
    });

    await test.step('월드에 들어가 골드가 0 인지 확인한다', async () => {
      await verify('월드 화면이 보인다', (await game.find(params.월드화면)) !== null, true, { blocker: true });
      await verify('새 캐릭터의 골드가 0 이다', (await 캐릭터읽기(admin, 나!)).gold, 0, { blocker: true });
    });

    await test.step('상점에서 물건을 산다', async () => {
      await game.click(params.상점열기버튼);
      await game.click(params.구매버튼);
      await verify('골드가 모자라 사지 못하면 「골드가 부족합니다.」 같은 한국어 안내가 보인다', await new 안내띠(game).뜬글(), '골드가 부족합니다.');
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
