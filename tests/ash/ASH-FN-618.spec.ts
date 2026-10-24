import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 바닥아이템만들기, 봇목록, 계정지우기, 고정비우기, type 바닥아이템정보, type 캐릭터 } from './helpers/game-state.helper.js';
import { 거리, 바닥아이템목록, 바닥아이템이사라질때까지, 월드에들어가기 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-618',
  name: '봇이 15m 안의 바닥 아이템으로 가서 줍는다',
  platforms: ['android'],
  precondition: ['새 캐릭터로 월드에 들어가 봇에게서 15m 안에 아이템을 떨어뜨렸다'],
  held: '보류 — 게임 창을 못 엶(월드 봇)',
  elements: ['zone:Beginner', 'drop:death_0이상'],
  params: z.object({
    입장버튼: z.string().describe('월드 입장 버튼 오브젝트 주소 — 게임 화면에서 읽는다'),
    월드화면: z.string().describe('월드 화면 오브젝트 주소 — 게임 화면에서 읽는다'),
    봇: z.string().describe('바닥 아이템 가까이 있는 봇 오브젝트 주소 — 게임 화면에서 읽는다'),
    바닥아이템: z.string().describe('떨어진 바닥 아이템 오브젝트 주소 — 게임 화면에서 읽는다'),
    줍는거리: z.number().min(1).describe('봇이 줍으러 가는 거리(m) — 1 이상').default(15),
  }),
  expected: z.object({
    지켜볼초: z.number().int().min(1).describe('봇이 줍는지 지켜볼 시간(초) — 1 이상 · 바닥 아이템은 180초 뒤 사라진다').default(60),
  }),
});

test(spec, async ({ game, admin, params, expected }) => {
  let 나: 캐릭터 | undefined;
  let 바닥: 바닥아이템정보 | undefined;
  let 앞수 = 0;
  try {
    await test.step('새 캐릭터로 월드에 들어가 봇에게서 15m 안에 아이템을 떨어뜨린다', async () => {
      await 고정비우기(admin);
      const 만든 = await 바닥아이템만들기(admin, 'zqa618');
      나 = 만든.떨군이;
      바닥 = 만든.바닥;
      await 월드에들어가기(game, 나, params.입장버튼, params.월드화면);
    });

    await test.step('바닥 아이템이 봇에게서 15m 안에 있는지 확인한다', async () => {
      await verify('월드 화면이 보인다', (await game.find(params.월드화면)) !== null, true, { blocker: true });
      await verify(
        '바닥 아이템이 목록에 있다',
        (await 바닥아이템목록(admin, 나!, 'Beginner')).some((x) => x.id === 바닥!.id),
        true,
        { blocker: true },
      );
      await verify('바닥 아이템이 봇에게서 15m 안에 있다', (await 거리(game, params.봇, params.바닥아이템)) <= params.줍는거리, true, { blocker: true });
      앞수 = (await 봇목록(admin, 나!, 'Beginner')).reduce((합, b) => 합 + b.itemCount, 0);
    });

    await test.step('봇을 지켜본다', async () => {
      const 사라짐 = await verify(
        '바닥 아이템이 사라진다',
        await 바닥아이템이사라질때까지(admin, 나!, 'Beginner', 바닥!.id, expected.지켜볼초 * 1000),
        true,
      );
      const 뒤수 = (await 봇목록(admin, 나!, 'Beginner')).reduce((합, b) => 합 + b.itemCount, 0);
      const 늘어남 = await verify('봇들의 아이템 수가 1 는다', 뒤수 - 앞수, 1);
      await verify('봇이 15m 안의 바닥 아이템으로 가서 줍는다', 사라짐 && 늘어남, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
