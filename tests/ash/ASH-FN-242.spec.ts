import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 몬스터처치, 바꾸기, 새캐릭터, 스폰목록, 순간이동, 캐릭터읽기, type 스폰정보, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-242',
  name: '성향치 995 에서 임프를 처치하면 성향치가 1000 이다',
  platforms: ['android'],
  precondition: ['성향치 995 인 새 캐릭터가 있다', '성향치 1000 인 새 캐릭터가 있다'],
  techniques: ['경계값 분석'],
  elements: ['monster:Imp'],
  params: z.object({
    첫성향치: z.number().int().min(991).max(1000).describe('임프를 처치하기 전 성향치 — 991 이상 1000 이하 (처치하면 1000 에서 멈춘다)').default(995),
    둘째성향치: z.number().int().min(991).max(1000).describe('임프를 처치하기 전 성향치 — 991 이상 1000 이하 (처치하면 1000 에서 멈춘다)').default(1000),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  let 스폰: 스폰정보 | undefined;
  let 둘째스폰: 스폰정보 | undefined;
  try {
    await test.step('새 캐릭터를 만들고 임프 스폰 자리로 옮긴다', async () => {
      나 = await 새캐릭터(admin, 'zqa242');
      [스폰, 둘째스폰] = (await 스폰목록(admin)).filter((x) => x.zone === 'Beginner' && x.monster === 'Imp');
      if (스폰 !== undefined) await 순간이동(admin, 나, { x: 스폰.x, z: 스폰.z });
    });

    await test.step('임프 스폰 두 곳이 있는지 확인한다', async () => {
      await verify('임프 스폰이 두 곳 있다', 둘째스폰 !== undefined, true, { blocker: true });
    });

    await test.step('임프 처치를 보고한다', async () => {
      await 바꾸기(admin, 나!, { alignment: params.첫성향치 });
      await verify('성향치가 995 다', (await 캐릭터읽기(admin, 나!)).alignment.value, params.첫성향치, { blocker: true });
      const 코드 = await verify('성향치 995 에서 처치한 응답 코드가 200 이다', (await 몬스터처치(admin, 나!, 스폰!)).status(), 200);
      const 최대 = await verify('성향치가 1000 이다', (await 캐릭터읽기(admin, 나!)).alignment.value, 1000);
      await verify('성향치 995 에서 임프를 처치하면 성향치가 1000 이다', 코드 && 최대, true);

      await 바꾸기(admin, 나!, { alignment: params.둘째성향치 });
      await verify('성향치가 1000 이다', (await 캐릭터읽기(admin, 나!)).alignment.value, params.둘째성향치, { blocker: true });
      const 둘째코드 = await verify('성향치 1000 에서 처치한 응답 코드가 200 이다', (await 몬스터처치(admin, 나!, 둘째스폰!)).status(), 200);
      const 둘째최대 = await verify('성향치가 1001 이 아니라 1000 이다', (await 캐릭터읽기(admin, 나!)).alignment.value, 1000);
      await verify('성향치 1000 에서 임프를 처치해도 성향치가 1001 이 아니라 1000 이다', 둘째코드 && 둘째최대, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
