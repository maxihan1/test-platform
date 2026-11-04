import { defineCase, test, verify } from '@platform/kit';

import { 몬스터처치, 사망알리기, 스폰고르기 } from './helpers/combat.helper.js';
import { 값읽기, 캐릭터읽기, 플레이어만들기, type 스폰, type 캐릭터, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-133',
  name: '경험치 20 인 1레벨 캐릭터가 죽으면 경험치를 10 잃는다',
  apiDoc: 2,
  precondition: ['1레벨 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 자리: 스폰 | undefined;

  await test.step('일회용 계정으로 1레벨 캐릭터를 만들고 임프 스폰을 고른다', async () => {
    나 = await 플레이어만들기(request);
    자리 = (await 스폰고르기(request, 나, 'Imp'))[0];
  });

  await test.step('1레벨 캐릭터와 임프 스폰이 있는지 확인한다', async () => {
    const 지금 = await 캐릭터읽기(request, 나);
    await verify('캐릭터 레벨이 1 이다', 지금.level, 1, { blocker: true });
    await verify('고를 임프 스폰이 있다', 자리 !== undefined, true, {
      blocker: true,
    });
  });

  await test.step('임프를 처치해 경험치 20 을 얻은 뒤 사망을 알린다', async () => {
    if (자리 === undefined) return;
    const 처치 = await 값읽기<{ character?: Partial<캐릭터> }>(await 몬스터처치(request, 나, 자리));
    await verify('임프를 처치한 캐릭터의 경험치가 20 이다', 처치.character?.exp, 20, { blocker: true });
    const 죽음 = await 값읽기<{
      expLost?: number;
      character?: Partial<캐릭터>;
    }>(await 사망알리기(request, 나));
    const 잃음 = await verify('죽어서 잃은 경험치가 10 이다', 죽음.expLost, 10);
    const 남음 = await verify('죽은 뒤 캐릭터의 경험치가 10 이다', 죽음.character?.exp, 10);
    await verify('경험치 20 인 1레벨 캐릭터가 죽으면 경험치를 10 잃는다', 잃음 && 남음, true);
  });
});
