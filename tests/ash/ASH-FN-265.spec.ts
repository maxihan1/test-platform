import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 본문, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 결과고정, 결과고정비우기, 새캐릭터, 설정읽기, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 서버지금, type 죽음결과, 죽음응답 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-265',
  name: '사망 드랍 아이템의 만료 시각은 죽은 때부터 180초 뒤다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판에 있고 사망 드랍이 나오도록 고정돼 있다'],
  elements: ['zone:Beginner', 'state:생존=죽음'],
  params: z.object({
    오차초: z.number().describe('만료 시각이 기준에서 벗어나도 되는 초 — 0 이상').default(5),
  }),
  expected: null,
});

test(spec, async ({ admin, request, params }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판에 만든다', async () => {
      await 결과고정비우기(admin);
      const 나 = await 새캐릭터(admin, 'qafn265');
      누구 = 나;
      await 순간이동(admin, 나, 'Beginner');
      await 결과고정(admin, { deathDrop: [true] });
    });
    await test.step('캐릭터가 초록 들판에 있고 사망 드랍이 나오도록 고정돼 있는지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
      await verify('사망 드랍이 나오도록 고정돼 있다', (await 설정읽기(admin)).forced.deathDrop[0], true, { blocker: true });
    });
    await test.step('몬스터에게 죽었다고 보고하고 바닥 아이템 만료 시각을 읽는다', async () => {
      const 응답 = await 죽음응답(request, 누구!);
      const 죽음 = await 본문<죽음결과>(응답, '사망 보고');
      const 죽은때 = 서버지금(응답);
      const 남은초 = (Date.parse(죽음.dropped?.expiresAt ?? '') - 죽은때) / 1000;
      await verify('사망 드랍 아이템의 만료 시각은 죽은 때부터 180초 뒤다', Math.abs(남은초 - 180) <= params.오차초, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
    await 결과고정비우기(admin);
  }
});
