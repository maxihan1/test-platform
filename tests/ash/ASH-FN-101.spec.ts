import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 스폰, 오류, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 스폰앞으로, 스폰찾기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 몬스터처치, 몬스터처치보내기 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-101',
  name: '임프를 처치하고 리젠 시간 − 2초가 지나기 전에 다시 보고하면 409 「COOLDOWN」이다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판 임프 스폰 앞에 있다'],
  techniques: ['경계값 분석'],
  elements: ['monster:Imp'],
  params: z.object({
    허용오차: z.number().describe('18초와의 허용 차이(초) — 0 이상 5 이하').default(2),
  }),
  expected: null,
});

test(spec, async ({ admin, request, params }) => {
  let 누구: 캐릭터 | undefined;
  let 스폰값: 스폰 | undefined;
  let 처치한때 = 0;
  try {
    await test.step('새 전사 캐릭터를 초록 들판 임프 스폰 앞으로 보낸다', async () => {
      누구 = await 새캐릭터(admin, 'qafn101');
      스폰값 = await 스폰찾기(admin, 'Beginner', 'Imp');
      await 스폰앞으로(admin, 누구, 스폰값);
    });
    await test.step('새 전사 캐릭터가 초록 들판에 있는지 확인한다', async () => {
      await verify('새 전사 캐릭터가 초록 들판에 있다', (await 캐릭터정보받기(request, 누구!)).zone, 'Beginner', { blocker: true });
    });
    await test.step('임프를 처치하고 같은 스폰을 바로 다시 보고한다', async () => {
      await 몬스터처치(request, 누구!, 스폰값!);
      처치한때 = Date.now();
      const 응답 = await 몬스터처치보내기(request, 누구!, 'Imp', 스폰값!);
      const 본문값 = await 오류(응답);
      const 상태 = await verify('응답 코드가 409 이다', 응답.status(), 409);
      const 코드 = await verify('오류 코드가 「COOLDOWN」이다', 본문값.code, 'COOLDOWN');
      await verify('임프를 처치하고 리젠 시간 − 2초가 지나기 전에 다시 보고하면 409 「COOLDOWN」이다', 상태 && 코드, true);
    });
    await test.step('같은 스폰 처치가 받아들여질 때까지 다시 보고한다', async () => {
      let 걸린초: number | undefined;
      while (Date.now() - 처치한때 < 40_000) {
        const 응답 = await 몬스터처치보내기(request, 누구!, 'Imp', 스폰값!);
        if (응답.ok()) {
          걸린초 = (Date.now() - 처치한때) / 1000;
          break;
        }
        await new Promise((깨운다) => setTimeout(깨운다, 500));
      }
      const 받아들여짐 = await verify('같은 스폰 처치가 40초 안에 다시 받아들여진다', 걸린초 !== undefined, true);
      const 가깝다 = await verify('다시 받아들여진 때가 18초와 허용 차이 안이다', 걸린초 !== undefined && Math.abs(걸린초 - 18) <= params.허용오차, true);
      await verify('임프를 처치한 뒤 같은 스폰 처치는 리젠 시간 − 2초(18초) 언저리에서 다시 받아들여진다', 받아들여짐 && 가깝다, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
