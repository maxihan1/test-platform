import { defineCase, test, verify } from '@platform/kit';

import { 몬스터처치, 스폰고르기 } from './helpers/combat.helper.js';
import { 오류코드읽기, 플레이어만들기, type 스폰, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-165',
  name: '같은 스폰을 리젠 시간 − 2초 안에 다시 처치하면 「COOLDOWN」으로 막힌다',
  apiDoc: 2,
  techniques: ['동등 분할'],
  precondition: ['임프 하나를 막 처치한 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 자리: 스폰 | undefined;
  let 첫처치성공 = false;

  await test.step('일회용 계정으로 캐릭터를 만들고 임프 하나를 처치한다', async () => {
    나 = await 플레이어만들기(request);
    자리 = (await 스폰고르기(request, 나, 'Imp'))[0];
    if (자리 === undefined) return;
    첫처치성공 = (await 몬스터처치(request, 나, 자리)).ok();
  });

  await test.step('임프 하나를 막 처치했는지 확인한다', async () => {
    await verify('고른 임프 스폰이 있다', 자리 !== undefined, true, {
      blocker: true,
    });
    await verify('임프 처치 응답이 성공이다', 첫처치성공, true, {
      blocker: true,
    });
  });

  await test.step('같은 스폰을 바로 다시 처치한다', async () => {
    if (자리 === undefined) return;
    const 응답 = await 몬스터처치(request, 나, 자리);
    await verify('같은 스폰을 리젠 시간 − 2초 안에 다시 처치하면 「COOLDOWN」으로 막힌다', await 오류코드읽기(응답), 'COOLDOWN');
  });
});
