import { defineCase, repeatUntil, test, verify } from '@platform/kit';

import { 스테이지까지 } from './helpers/enter.helper.js';
import { 거리먹이 } from './helpers/stage.helper.js';
import { 스테이지화면 } from './pages/stage.page.js';

export const spec = defineCase({
  tcId: 'CGP-GS-002',
  name: '먹이 막대를 끝까지 채우면 식물 레벨이 2 로 오른다',
  platforms: ['windows'],
  precondition: ['첫 맵 1P 스테이지 · 고기 20 · 식물 하나를 심음'],
  params: null,
  expected: null,
});

const 레벨 = (주소: string): number => Number(/_Level(\d)/.exec(주소)?.[1] ?? 0);

test(spec, async ({ game }) => {
  let 스테이지!: 스테이지화면;
  let 식물 = '';

  await test.step('첫 맵 스테이지에 들어가 식물 하나를 심는다', async () => {
    스테이지 = await 스테이지까지(game);
    await 스테이지.자리에심기([18.2, 27.0]);
    await 스테이지.식물수될때까지(1, 5_000);
    식물 = (await 스테이지.식물들())[0] ?? '';
    await verify('레벨 1 식물이 하나 심겨 있다', 레벨(식물), 1, { blocker: true });
  });

  await test.step('심은 식물 왼쪽에 서서 C 로 먹이 막대를 끝까지 채운다', async () => {
    const 자리 = await 스테이지.식물자리(식물);
    let 지금 = 식물;
    let 멈춤: unknown;
    try {
      await repeatUntil(
        async () => {
          await 거리먹이(game, [자리[0], 자리[1]], [[-1.3, 0]], true);
        },
        {
          progress: async () => {
            지금 = (await 스테이지.식물들())[0] ?? 지금;
            return 레벨(지금) * 100 + (레벨(지금) === 1 ? await 스테이지.먹인고기(지금).catch(() => 0) : 0);
          },
          goal: 200,
          stallMs: 30_000,
        },
      );
    } catch (e) {
      멈춤 = e;
    }
    await verify('먹이 막대를 끝까지 채우면 식물 레벨이 2 로 오른다', 레벨(지금), 2);
    if (멈춤 !== undefined) throw 멈춤;
  });
});
