import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 바꾸기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-062',
  name: '레벨을 50 으로 바꾸면 레벨이 50 이다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 마을에 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    안쪽레벨: z.number().int().min(1).max(50).describe('바꿀 레벨 — 최대 레벨 50 이하').default(50),
    바깥레벨: z.number().int().min(51).describe('바꾸려 할 레벨 — 최대 레벨 50 초과').default(51),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa062');
    });

    await test.step('새 캐릭터가 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 마을에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Town', { blocker: true });
    });

    await test.step('레벨을 50 으로 바꾼다', async () => {
      await 바꾸기(admin, 나!, { level: params.안쪽레벨 });
      const 읽음 = await 캐릭터읽기(admin, 나!);
      await verify('레벨을 50 으로 바꾸면 레벨이 50 이다', 읽음.level, params.안쪽레벨);
    });

    await test.step('레벨을 51 로 바꾼다', async () => {
      const 응답 = await admin.patch(`/admin/characters/${String(나!.id)}`, { data: { level: params.바깥레벨 } });
      const 서버오류없음 = await verify('레벨 변경 요청이 서버 오류로 끝나지 않는다', 응답.status() < 500, true);
      const 읽음 = await 캐릭터읽기(admin, 나!);
      const 넘지않음 = await verify('캐릭터 레벨이 50 이하다', 읽음.level <= 50, true);
      await verify('레벨을 51 로 바꾸려 하면 레벨이 50 을 넘지 않는다', 서버오류없음 && 넘지않음, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
