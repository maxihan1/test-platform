import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 몬스터처치, 스폰고르기 } from './helpers/combat.helper.js';
import { GM성향, 값읽기, 캐릭터읽기, 플레이어만들기, type 스폰, type 캐릭터, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-296',
  name: '성향치 990 에서 몬스터를 처치하면 성향치가 1000 이다',
  apiDoc: 1,
  techniques: ['경계값 분석'],
  precondition: ['성향치 990 인 캐릭터가 있다', '성향치 995 인 캐릭터가 있다'],
  params: z.object({
    한도에닿는성향치: z.number().int().describe('처치 전 성향치 — 990~1000').default(990),
    한도를넘는성향치: z.number().int().describe('처치 전 성향치 — 991~1000').default(995),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  let 첫째!: 플레이어;
  let 둘째!: 플레이어;
  let 자리: 스폰 | undefined;

  await test.step('일회용 계정으로 캐릭터 둘을 만들고 성향치를 맞춘다', async () => {
    첫째 = await 플레이어만들기(request);
    둘째 = await 플레이어만들기(request);
    await GM성향(request, 첫째, params.한도에닿는성향치);
    await GM성향(request, 둘째, params.한도를넘는성향치);
    자리 = (await 스폰고르기(request, 첫째, 'Imp'))[0];
  });

  await test.step('성향치를 맞춘 캐릭터 둘과 임프 스폰을 확인한다', async () => {
    await verify('첫째 캐릭터의 성향치가 맞춘 값과 같다', (await 캐릭터읽기(request, 첫째)).alignment.value, params.한도에닿는성향치, {
      blocker: true,
    });
    await verify('둘째 캐릭터의 성향치가 맞춘 값과 같다', (await 캐릭터읽기(request, 둘째)).alignment.value, params.한도를넘는성향치, {
      blocker: true,
    });
    await verify('고를 임프 스폰이 있다', 자리 !== undefined, true, {
      blocker: true,
    });
  });

  await test.step('임프를 처치한다', async () => {
    if (자리 === undefined) return;
    const 첫째값 = await 값읽기<{ character?: Partial<캐릭터> }>(await 몬스터처치(request, 첫째, 자리));
    await verify('성향치 990 에서 몬스터를 처치하면 성향치가 1000 이다', 첫째값.character?.alignment?.value, 1000);
    const 둘째값 = (await 값읽기<{ character?: Partial<캐릭터> }>(await 몬스터처치(request, 둘째, 자리))).character?.alignment?.value;
    await verify('성향치 995 에서 몬스터를 처치하면 성향치가 1000 을 넘지 않는다', 둘째값 !== undefined && 둘째값 <= 1000, true);
  });
});
