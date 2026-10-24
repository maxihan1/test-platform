import { defineCase, test, verify } from '@platform/kit';

import { 본문, type 스폰, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 스폰앞으로, 스폰찾기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 임프처치 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-238',
  name: '몬스터 1마리를 처치하면 성향치가 10 오른다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판 임프 스폰 앞에 있다'],
  elements: ['zone:Beginner', 'monster:Imp'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 스폰자리: 스폰 | undefined;
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판 임프 스폰 앞에 만든다', async () => {
      const 나 = await 새캐릭터(admin, 'qafn238');
      누구 = 나;
      const 자리 = await 스폰찾기(admin, 'Beginner', 'Imp');
      스폰자리 = 자리;
      await 스폰앞으로(admin, 나, 자리);
    });
    await test.step('새 캐릭터가 초록 들판 임프 스폰 앞에 있는지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
      await verify('캐릭터가 임프 스폰 앞에 있다', Math.hypot(정보.position.x - 스폰자리!.x, 정보.position.z - 스폰자리!.z) <= 1, true, { blocker: true });
    });
    await test.step('임프 처치를 보고한다', async () => {
      await 본문(await 임프처치(request, 누구!, 스폰자리!), '임프 처치');
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('몬스터 1마리를 처치하면 성향치가 10 오른다', 정보.alignment.value, 10);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
