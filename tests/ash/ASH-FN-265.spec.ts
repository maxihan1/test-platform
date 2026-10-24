import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 바닥아이템만들기, 계정지우기, 고정비우기, type 바닥아이템정보, type 캐릭터 } from './helpers/game-state.helper.js';
import { 바닥아이템목록, 서버시각 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-265',
  name: '사망 드랍 아이템의 만료 시각이 떨어진 때부터 180초 뒤다',
  platforms: ['android'],
  precondition: ['사망 드랍으로 바닥에 아이템을 떨어뜨린 새 캐릭터가 있다'],
  elements: ['zone:Beginner', 'drop:death_0이상'],
  params: null,
  expected: z.object({
    허용오차초: z.number().int().min(0).describe('만료 시각 허용 오차(초) — 0 이상 · 떨어진 때를 서버 시각 두 번 사이로 잡아서 필요하다').default(5),
  }),
});

test(spec, async ({ admin, expected }) => {
  let 떨군이: 캐릭터 | undefined;
  let 바닥: 바닥아이템정보 | undefined;
  let 앞 = 0;
  let 뒤 = 0;
  try {
    await test.step('사망 드랍으로 바닥에 아이템을 떨어뜨린 새 캐릭터를 만든다', async () => {
      await 고정비우기(admin);
      앞 = await 서버시각(admin);
      const 만든 = await 바닥아이템만들기(admin, 'zqa265');
      뒤 = await 서버시각(admin);
      떨군이 = 만든.떨군이;
      바닥 = 만든.바닥;
    });

    await test.step('바닥 아이템 목록에 떨어뜨린 아이템이 있는지 확인한다', async () => {
      const 목록 = await 바닥아이템목록(admin, 떨군이!, 'Beginner');
      await verify('바닥 아이템 목록에 사망 드랍 아이템이 있다', 목록.some((x) => x.id === 바닥!.id), true, { blocker: true });
    });

    await test.step('바닥 아이템 목록에서 그 아이템을 읽는다', async () => {
      const 읽음 = (await 바닥아이템목록(admin, 떨군이!, 'Beginner')).find((x) => x.id === 바닥!.id);
      const 만료 = Date.parse(읽음?.expiresAt ?? '');
      const 가장짧게 = (만료 - (뒤 + 1000)) / 1000;
      const 가장길게 = (만료 - 앞) / 1000;
      const 오차 = expected.허용오차초;
      const 수명 = 180 >= 가장짧게 - 오차 && 180 <= 가장길게 + 오차 ? 180 : 180 < 가장짧게 ? 가장짧게 : 가장길게;
      await verify('사망 드랍 아이템의 만료 시각이 떨어진 때부터 180초 뒤다', 수명, 180);
    });
  } finally {
    await 고정비우기(admin);
    if (떨군이 !== undefined) await 계정지우기(admin, 떨군이);
  }
});
