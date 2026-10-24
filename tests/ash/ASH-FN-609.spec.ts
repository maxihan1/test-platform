import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 바꾸기, 새캐릭터, 순간이동, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-609',
  name: '악명 캐릭터가 마을에 들어가면 경비병이 공격한다',
  platforms: ['android'],
  held: '보류 — 게임 창을 못 엶(월드 마을)',
  precondition: ['악명 새 캐릭터로 월드에 들어가 마을에 있다'],
  elements: ['zone:Town', 'npc:경비병', 'state:성향=악명'],
  params: z.object({
    경비병주소: z.string().describe('마을 경비병 오브젝트 주소 — 게임 화면에서 읽는다'),
    공격표시주소: z.string().describe('경비병 공격 표시 오브젝트 주소 — 게임 화면에서 읽는다'),
  }),
  expected: null,
});

test(spec, async ({ admin, game, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('악명 새 캐릭터를 만들어 마을에 둔다', async () => {
      나 = await 새캐릭터(admin, 'zqa609');
      await 바꾸기(admin, 나, { alignment: -1 });
      await 순간이동(admin, 나, 'Town');
    });

    await test.step('악명 새 캐릭터가 마을에 있고 경비병이 보이는지 확인한다', async () => {
      const 지금 = await 캐릭터읽기(admin, 나!);
      await verify('성향 상태가 「Chaotic」이다', 지금.alignment.state, 'Chaotic', { blocker: true });
      await verify('캐릭터가 마을에 있다', 지금.zone, 'Town', { blocker: true });
      await verify('마을 경비병이 게임 화면에 있다', (await game.find(params.경비병주소)) !== null, true, { blocker: true });
    });

    await test.step('마을 경비병 가까이 간다', async () => {
      await game.waitFor(params.공격표시주소, { timeoutMs: 30_000 });
      await verify('악명 캐릭터가 마을에 들어가면 경비병이 공격한다', (await game.find(params.공격표시주소)) !== null, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
