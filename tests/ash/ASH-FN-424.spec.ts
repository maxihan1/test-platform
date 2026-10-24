import { defineCase, test, verify } from '@platform/kit';

import { 목록글, 새캐릭터자리, 아이템번호, type 장비응답, 칸들 } from './helpers/admin.helper.js';
import { 본문, 장착하기, 찾기, type 캐릭터 } from './helpers/api.helper.js';
import { 가방읽기, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-424',
  name: '장비를 장착하면 inventory · stats 가 온다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 철 투구를 가지고 있다'],
  elements: ['item:helm_iron'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn424');
    });
    await test.step('새 전사 캐릭터에게 철 투구를 준다', async () => {
      await 아이템주기(admin, 누구!, 'helm_iron');
    });
    await test.step('새 전사 캐릭터가 가진 철 투구를 확인한다', async () => {
      await verify('새 전사 캐릭터가 철 투구를 가지고 있다', 찾기(await 가방읽기(admin, 누구!), 'helm_iron') !== undefined, true, { blocker: true });
    });
    await test.step('철 투구를 장착한다', async () => {
      const 나 = 누구!;
      const 응답 = await 본문<장비응답>(await 장착하기(request, 나, 아이템번호(await 가방읽기(admin, 나), 'helm_iron')), '장착');
      await verify('장비를 장착하면 inventory · stats 가 온다', 칸들(응답), 목록글('inventory', 'stats'));
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
