import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 산봇들, 새캐릭터, 순간이동, type 캐릭터 } from './helpers/game-state.helper.js';
import { 거리, 거리가바뀔때까지, 월드에들어가기 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-614',
  name: '반격형 봇은 선량한 플레이어를 무시하다가 공격받으면 반격한다',
  platforms: ['android'],
  precondition: ['새 캐릭터로 월드에 들어가 반격형 봇 가까이에 있다'],
  held: '보류 — 게임 창을 못 엶(월드 봇)',
  elements: ['zone:Beginner', 'state:성향=선량'],
  params: z.object({
    입장버튼: z.string().describe('월드 입장 버튼 오브젝트 주소 — 게임 화면에서 읽는다'),
    월드화면: z.string().describe('월드 화면 오브젝트 주소 — 게임 화면에서 읽는다'),
    플레이어: z.string().describe('내 캐릭터 오브젝트 주소 — 게임 화면에서 읽는다'),
    반격형봇: z.string().describe('곁에 있는 반격형 봇 오브젝트 주소 — 게임 화면에서 읽는다'),
    공격버튼: z.string().describe('공격 버튼 오브젝트 주소 — 게임 화면에서 읽는다'),
  }),
  expected: z.object({
    지켜볼초: z.number().int().min(1).describe('반격하는지 지켜볼 시간(초) — 1 이상').default(10),
  }),
});

test(spec, async ({ game, admin, params, expected }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터로 월드에 들어가 반격형 봇 가까이에 선다', async () => {
      나 = await 새캐릭터(admin, 'zqa614');
      await 순간이동(admin, 나, 'Beginner');
      await 월드에들어가기(game, 나, params.입장버튼, params.월드화면);
    });

    await test.step('월드와 반격형 봇이 보이는지 확인한다', async () => {
      await verify('월드 화면이 보인다', (await game.find(params.월드화면)) !== null, true, { blocker: true });
      await verify('반격형 봇이 보인다', (await game.find(params.반격형봇)) !== null, true, { blocker: true });
      const 반격형 = (await 산봇들(admin, 나!, 'Beginner')).filter((b) => b.temperament === 'Retaliate');
      await verify('초록 들판에 살아 있는 반격형 봇이 있다', 반격형.length > 0, true, { blocker: true });
    });

    await test.step('반격형 봇 곁에 서 있다가 봇을 공격한다', async () => {
      const 기준 = await 거리(game, params.플레이어, params.반격형봇);
      await game.click(params.공격버튼);
      const 다가옴 = await 거리가바뀔때까지(game, params.플레이어, params.반격형봇, 기준, '가까워짐', expected.지켜볼초 * 1000);
      await verify('반격형 봇은 선량한 플레이어를 무시하다가 공격받으면 반격한다', 다가옴, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
