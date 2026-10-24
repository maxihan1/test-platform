import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 구역자리, 레벨주기, 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 사망보고 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-064',
  name: '레벨 5 캐릭터가 죽으면 경험치를 1,500 의 10% 인 150 잃는다',
  platforms: ['android'],
  precondition: ['레벨 5 경험치 1,000 인 새 전사 캐릭터가 초록 들판에 있다'],
  elements: ['state:생존=죽음', 'zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('레벨 5 경험치 1,000 인 새 전사 캐릭터를 초록 들판으로 보낸다', async () => {
      누구 = await 새캐릭터(admin, 'qafn064');
      await 레벨주기(admin, 누구, 5, 1000);
      await 순간이동(admin, 누구, 'Beginner');
    });
    await test.step('새 전사 캐릭터가 레벨 5 경험치 1000 로 초록 들판에 있는지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('새 전사 캐릭터가 레벨 5 이다', 정보.level, 5, { blocker: true });
      await verify('새 전사 캐릭터의 경험치가 1000 이다', 정보.exp, 1000, { blocker: true });
      await verify('새 전사 캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
    });
    await test.step('몬스터에게 죽었다고 보고한다', async () => {
      const 결과 = await 사망보고(request, 누구!, 구역자리.Beginner);
      const 잃은 = await verify('경험치 150 을 잃는다', 결과.expLost, 150);
      const 줄어든 = await verify('경험치가 150 줄어든다', 1000 - 결과.character.exp, 150);
      await verify('레벨 5 캐릭터가 죽으면 경험치를 1,500 의 10% 인 150 잃는다', 잃은 && 줄어든, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
