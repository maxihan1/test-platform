import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 새캐릭터, 순간이동, type 캐릭터 } from './helpers/game-state.helper.js';
import { 마을에간봇이생길때까지, 월드에들어가기 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-616',
  name: '사냥터 봇이 몬스터를 사냥하다가 가끔 마을로 돌아간다',
  platforms: ['android'],
  precondition: ['새 캐릭터로 월드에 들어가 있다'],
  held: '보류 — 게임 창을 못 엶(월드 봇)',
  elements: ['zone:Beginner', 'zone:Town'],
  params: z.object({
    입장버튼: z.string().describe('월드 입장 버튼 오브젝트 주소 — 게임 화면에서 읽는다'),
    월드화면: z.string().describe('월드 화면 오브젝트 주소 — 게임 화면에서 읽는다'),
  }),
  expected: z.object({
    지켜볼초: z.number().int().min(1).describe('봇이 마을로 돌아가길 지켜볼 시간(초) — 1 이상 · 길수록 안 놓친다').default(120),
  }),
});

test(spec, async ({ game, admin, params, expected }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터로 월드에 들어간다', async () => {
      나 = await 새캐릭터(admin, 'zqa616');
      await 순간이동(admin, 나, 'Beginner');
      await 월드에들어가기(game, 나, params.입장버튼, params.월드화면);
    });

    await test.step('월드에 들어갔는지 확인한다', async () => {
      await verify('월드 화면이 보인다', (await game.find(params.월드화면)) !== null, true, { blocker: true });
    });

    await test.step('사냥터 봇을 지켜본다', async () => {
      const 돌아감 = await 마을에간봇이생길때까지(admin, 나!, expected.지켜볼초 * 1000);
      await verify('사냥터 봇이 몬스터를 사냥하다가 가끔 마을로 돌아간다', 돌아감, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
