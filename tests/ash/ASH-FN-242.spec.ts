import { defineCase, test, verify } from '@platform/kit';

import { 본문, type 스폰, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 성향주기, 스폰앞으로, 스폰찾기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 임프처치 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-242',
  name: '성향치 990 인 캐릭터가 몬스터를 처치하면 성향치가 1000 이다',
  platforms: ['android'],
  precondition: ['성향치 990 인 새 전사 캐릭터가 초록 들판 임프 스폰 앞에 있다', '성향치 1000 인 새 전사 캐릭터가 초록 들판 임프 스폰 앞에 있다'],
  techniques: ['경계값 분석'],
  elements: ['zone:Beginner', 'monster:Imp'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 스폰자리: 스폰 | undefined;
  let 아래: 캐릭터 | undefined;
  let 위: 캐릭터 | undefined;
  try {
    await test.step('성향치 990 인 새 전사 캐릭터를 초록 들판 임프 스폰 앞에 만든다', async () => {
      const 나 = await 새캐릭터(admin, 'qafn242');
      아래 = 나;
      await 성향주기(admin, 나, 990);
      const 자리 = await 스폰찾기(admin, 'Beginner', 'Imp');
      스폰자리 = 자리;
      await 스폰앞으로(admin, 나, 자리);
    });
    await test.step('성향치 990 인 캐릭터가 초록 들판 임프 스폰 앞에 있는지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 아래!);
      await verify('캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
      await verify('캐릭터가 임프 스폰 앞에 있다', Math.hypot(정보.position.x - 스폰자리!.x, 정보.position.z - 스폰자리!.z) <= 1, true, { blocker: true });
      await verify('캐릭터의 성향치가 990 이다', 정보.alignment.value, 990, { blocker: true });
    });
    await test.step('성향치 1000 인 새 전사 캐릭터를 초록 들판 임프 스폰 앞에 만든다', async () => {
      const 나 = await 새캐릭터(admin, 'qafn242');
      위 = 나;
      await 성향주기(admin, 나, 1000);
      await 스폰앞으로(admin, 나, 스폰자리!);
    });
    await test.step('성향치 1000 인 캐릭터가 초록 들판 임프 스폰 앞에 있는지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 위!);
      await verify('캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
      await verify('캐릭터가 임프 스폰 앞에 있다', Math.hypot(정보.position.x - 스폰자리!.x, 정보.position.z - 스폰자리!.z) <= 1, true, { blocker: true });
      await verify('캐릭터의 성향치가 1000 이다', 정보.alignment.value, 1000, { blocker: true });
    });
    await test.step('임프 처치를 보고한다', async () => {
      await 본문(await 임프처치(request, 아래!, 스폰자리!), '임프 처치');
      const 아래정보 = await 캐릭터정보받기(request, 아래!);
      await verify('성향치 990 인 캐릭터가 몬스터를 처치하면 성향치가 1000 이다', 아래정보.alignment.value, 1000);
      await 본문(await 임프처치(request, 위!, 스폰자리!), '임프 처치');
      const 위정보 = await 캐릭터정보받기(request, 위!);
      await verify('성향치 1000 인 캐릭터가 몬스터를 처치해도 성향치가 1001 이 되지 않는다', 위정보.alignment.value > 1000, false);
    });
  } finally {
    if (아래 !== undefined) await 캐릭터지우기(admin, 아래);
    if (위 !== undefined) await 캐릭터지우기(admin, 위);
  }
});
