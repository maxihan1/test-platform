import { defineCase, test, verify } from '@platform/kit';

import { 몬스터처치, 스폰고르기 } from './helpers/combat.helper.js';
import { 값읽기, 캐릭터읽기, 플레이어만들기, type 스폰, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-142',
  name: '임프를 처치하면 경험치를 20 얻는다',
  apiDoc: 1,
  precondition: ['1레벨 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 임프나!: 플레이어;
  let 반달나!: 플레이어;
  let 군주나!: 플레이어;
  let 임프자리: 스폰 | undefined;
  let 반달자리: 스폰 | undefined;
  let 군주자리: 스폰 | undefined;

  await test.step('일회용 계정으로 1레벨 캐릭터 셋을 만들고 스폰을 고른다', async () => {
    임프나 = await 플레이어만들기(request);
    반달나 = await 플레이어만들기(request);
    군주나 = await 플레이어만들기(request);
    임프자리 = (await 스폰고르기(request, 임프나, 'Imp'))[0];
    반달자리 = (await 스폰고르기(request, 반달나, 'VandalImp'))[0];
    군주자리 = (await 스폰고르기(request, 군주나, 'ImpBoss'))[0];
  });

  await test.step('1레벨 캐릭터 셋과 스폰이 있는지 확인한다', async () => {
    await verify('임프를 처치할 캐릭터 레벨이 1 이다', (await 캐릭터읽기(request, 임프나)).level, 1, { blocker: true });
    await verify('반달 임프를 처치할 캐릭터 레벨이 1 이다', (await 캐릭터읽기(request, 반달나)).level, 1, { blocker: true });
    await verify('임프 군주를 처치할 캐릭터 레벨이 1 이다', (await 캐릭터읽기(request, 군주나)).level, 1, { blocker: true });
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
    const 값 = await 값읽기<{ expGained?: number }>(await 몬스터처치(request, 임프나, 임프자리));
    await verify('임프를 처치하면 경험치를 20 얻는다', 값.expGained, 20);
  });

  await test.step('반달 임프를 처치한다', async () => {
    if (반달자리 === undefined) return;
    const 값 = await 값읽기<{ expGained?: number }>(await 몬스터처치(request, 반달나, 반달자리));
    await verify('반달 임프를 처치하면 경험치를 90 얻는다', 값.expGained, 90);
  });

  await test.step('임프 군주를 처치한다', async () => {
    if (군주자리 === undefined) return;
    const 값 = await 값읽기<{ expGained?: number }>(await 몬스터처치(request, 군주나, 군주자리));
    await verify('임프 군주를 처치하면 경험치를 2000 얻는다', 값.expGained, 2000);
  });
});
