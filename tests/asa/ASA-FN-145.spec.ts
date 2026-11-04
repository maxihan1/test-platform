import { defineCase, test, verify } from '@platform/kit';

import { 몬스터처치, 스폰고르기 } from './helpers/combat.helper.js';
import { 값읽기, 플레이어만들기, type 스폰, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-145',
  name: '임프를 처치하면 얻는 골드가 8~15 안이다',
  apiDoc: 1,
  precondition: ['캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 임프자리: 스폰 | undefined;
  let 반달자리: 스폰 | undefined;
  let 군주자리: 스폰 | undefined;

  await test.step('일회용 계정으로 캐릭터를 만들고 스폰을 고른다', async () => {
    나 = await 플레이어만들기(request);
    임프자리 = (await 스폰고르기(request, 나, 'Imp'))[0];
    반달자리 = (await 스폰고르기(request, 나, 'VandalImp'))[0];
    군주자리 = (await 스폰고르기(request, 나, 'ImpBoss'))[0];
  });

  await test.step('캐릭터와 스폰이 있는지 확인한다', async () => {
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('고를 임프 스폰이 있다', 임프자리 !== undefined, true, {
      blocker: true,
    });
    await verify('고를 반달 임프 스폰이 있다', 반달자리 !== undefined, true, {
      blocker: true,
    });
    await verify('고를 임프 군주 스폰이 있다', 군주자리 !== undefined, true, {
      blocker: true,
    });
  });

  await test.step('임프를 처치한다', async () => {
    if (임프자리 === undefined) return;
    const 골드 = (await 값읽기<{ goldGained?: number }>(await 몬스터처치(request, 나, 임프자리))).goldGained ?? NaN;
    const 아래 = await verify('임프를 처치해 얻는 골드가 8 이상이다', 골드 >= 8, true);
    const 위 = await verify('임프를 처치해 얻는 골드가 15 이하다', 골드 <= 15, true);
    await verify('임프를 처치하면 얻는 골드가 8~15 안이다', 아래 && 위, true);
  });

  await test.step('반달 임프를 처치한다', async () => {
    if (반달자리 === undefined) return;
    const 골드 = (await 값읽기<{ goldGained?: number }>(await 몬스터처치(request, 나, 반달자리))).goldGained ?? NaN;
    const 아래 = await verify('반달 임프를 처치해 얻는 골드가 30 이상이다', 골드 >= 30, true);
    const 위 = await verify('반달 임프를 처치해 얻는 골드가 55 이하다', 골드 <= 55, true);
    await verify('반달 임프를 처치하면 얻는 골드가 30~55 안이다', 아래 && 위, true);
  });

  await test.step('임프 군주를 처치한다', async () => {
    if (군주자리 === undefined) return;
    const 골드 = (await 값읽기<{ goldGained?: number }>(await 몬스터처치(request, 나, 군주자리))).goldGained ?? NaN;
    const 아래 = await verify('임프 군주를 처치해 얻는 골드가 800 이상이다', 골드 >= 800, true);
    const 위 = await verify('임프 군주를 처치해 얻는 골드가 1200 이하다', 골드 <= 1200, true);
    await verify('임프 군주를 처치하면 얻는 골드가 800~1200 안이다', 아래 && 위, true);
  });
});
