import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 봇, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 결과고정비우기, 드랍확률되돌리기, 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 봇들을처치한결과, 봇전리품확률바꾸기, 봇전리품확률읽기, 빨간봇으로만들기, 새로시드한선량봇들, 전리품수 } from './helpers/loot.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-278',
  name: '악명 봇 전리품 확률을 100% 로 바꾸고 빨간 이름 봇을 5번 처치하면 5번 다 전리품을 얻는다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판에 있고 악명 봇 전리품 확률이 100% 다', '새 전사 캐릭터가 초록 들판에 있고 악명 봇 전리품 확률이 0% 다'],
  techniques: ['경계값 분석'],
  elements: ['zone:Beginner', 'drop:bot_loot_chaotic', 'state:성향=악명'],
  params: z.object({
    횟수: z.number().int().describe('처치할 횟수 — 1 이상 · 10 이하').default(5),
  }),
  expected: null,
});

test(spec, async ({ admin, request, params }) => {
  let 빨강들: 봇[] = [];
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판에 만들고 악명 봇 전리품 확률을 100% 로 바꾼다', async () => {
      await 결과고정비우기(admin);
      await 드랍확률되돌리기(admin);
      const 나 = await 새캐릭터(admin, 'qafn278');
      누구 = 나;
      const 봇들 = await 새로시드한선량봇들(admin, 나, params.횟수 * 2);
      빨강들 = await 빨간봇으로만들기(request, admin, [나], 봇들);
      await 순간이동(admin, 나, 'Beginner');
      await 봇전리품확률바꾸기(admin, true, 1);
    });
    await test.step('캐릭터가 초록 들판에 있고 악명 봇 전리품 확률이 100% 인지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
      await verify('악명 봇 전리품 확률이 100% 다', await 봇전리품확률읽기(admin, true), 1, { blocker: true });
    });
    await test.step('빨간 이름 봇 처치를 5번 보고한다', async () => {
      const 모두 = 전리품수(await 봇들을처치한결과(request, 누구!, 빨강들.slice(0, params.횟수)));
      await verify('악명 봇 전리품 확률을 100% 로 바꾸고 빨간 이름 봇을 5번 처치하면 5번 다 전리품을 얻는다', 모두, params.횟수);
      await 봇전리품확률바꾸기(admin, true, 0);
      await verify('악명 봇 전리품 확률이 0% 다', await 봇전리품확률읽기(admin, true), 0, { blocker: true });
      const 없음 = 전리품수(await 봇들을처치한결과(request, 누구!, 빨강들.slice(params.횟수)));
      await verify('악명 봇 전리품 확률을 0% 로 바꾸고 빨간 이름 봇을 5번 처치하면 한 번도 전리품을 얻지 못한다', 없음, 0);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
    await 드랍확률되돌리기(admin);
    await 결과고정비우기(admin);
  }
});
