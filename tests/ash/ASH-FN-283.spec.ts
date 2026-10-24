import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 고정비우기, 봇처치, 새캐릭터, 순간이동, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 봇부활기다리기, 봇찾기, 산봇하나 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-283',
  name: '봇을 처치하면 60초 뒤 그 봇이 다시 살아난다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 초록 들판에 있다'],
  elements: ['zone:Beginner', 'state:성향=선량', 'state:생존=죽음'],
  params: null,
  expected: z.object({
    허용오차초: z.number().int().min(0).describe('부활 시간 허용 오차(초) — 0 이상 · 서버가 부활을 주기로 처리하면 더 크게').default(5),
  }),
});

test(spec, async ({ admin, expected }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 초록 들판에 둔다', async () => {
      나 = await 새캐릭터(admin, 'zqa283');
      await 순간이동(admin, 나, 'Beginner');
      await 고정비우기(admin);
    });

    await test.step('새 캐릭터가 초록 들판에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 초록 들판에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Beginner', { blocker: true });
    });

    await test.step('선량한 봇을 처치하고 봇 목록을 다시 읽는다', async () => {
      const 봇 = await 산봇하나(admin, 나!, 'Beginner', 'Innocent');
      const 응답 = await 봇처치(admin, 나!, 봇.id);
      await verify('봇 처치 응답이 200 이다', 응답.status(), 200, { blocker: true });
      const 처치후 = await 봇찾기(admin, 나!, 봇.id);
      await verify('처치한 봇이 죽은 상태로 읽힌다', 처치후?.isDead, true);
      const 걸린초 = await 봇부활기다리기(admin, 나!, 봇.id, (60 + expected.허용오차초 + 10) * 1000);
      const 살아남 = await verify('처치한 봇이 다시 살아난다', 걸린초 !== null, true);
      const 부활초 = 걸린초 === null ? -1 : Math.abs(걸린초 - 60) <= expected.허용오차초 ? 60 : Math.round(걸린초);
      const 시간 = await verify('봇이 처치한 때부터 60초 뒤에 살아난다', 부활초, 60);
      await verify('봇을 처치하면 60초 뒤 그 봇이 다시 살아난다', 살아남 && 시간, true);
    });
  } finally {
    await 고정비우기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
