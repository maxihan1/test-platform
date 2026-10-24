import { defineCase, test, verify } from '@platform/kit';

import { 새캐릭터자리 } from './helpers/admin.helper.js';
import { 본문, type 캐릭터 } from './helpers/api.helper.js';
import { 골드주기, 원장읽기, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-589',
  name: '캐릭터를 초기화하면 원장에 「ADMIN_RESET」이 남는다',
  platforms: ['android'],
  precondition: ['골드 9,999 인 새 전사 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn589');
    });
    await test.step('새 전사 캐릭터의 골드를 9,999 로 바꿔 둔다', async () => {
      await 골드주기(admin, 누구!, 9999);
    });
    await test.step('새 전사 캐릭터의 골드를 확인한다', async () => {
      await verify('골드 9,999 인 새 전사 캐릭터가 있다', (await 캐릭터읽기(admin, 누구!)).gold, 9999, { blocker: true });
    });
    await test.step('어드민으로 캐릭터를 초기화하고 원장을 받는다', async () => {
      const 나 = 누구!;
      await 본문(await admin.post(`/admin/characters/${String(나.번호)}/reset`), '캐릭터 초기화');
      const 원장 = await 원장읽기(admin, 나);
      await verify('캐릭터를 초기화하면 원장에 「ADMIN_RESET」이 남는다', 원장.some((줄) => 줄.reason === 'ADMIN_RESET'), true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
