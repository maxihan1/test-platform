import { defineCase, test, verify } from '@platform/kit';

import {
  계정지우기,
  바꾸기,
  새계정,
  응답몸,
  캐릭터더하기,
  캐릭터읽기,
  플레이어머리,
  type 계정,
  type 캐릭터,
} from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-334',
  name: '둘째 캐릭터 번호를 X-Character-Id 로 주면 둘째 캐릭터의 원장이 온다',
  platforms: ['android'],
  precondition: ['캐릭터 둘을 가진 새 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 계정 | undefined;
  let 첫째: 캐릭터 | undefined;
  let 둘째: 캐릭터 | undefined;
  let 더한골드 = 0;
  try {
    await test.step('캐릭터 둘을 가진 새 계정을 만든다', async () => {
      나 = await 새계정(admin, 'zqa334');
      첫째 = await 캐릭터더하기(admin, 나);
      둘째 = await 캐릭터더하기(admin, 나);
      더한골드 = 777;
      await 바꾸기(admin, 둘째, { gold: (await 캐릭터읽기(admin, 둘째)).gold + 더한골드 });
    });

    await test.step('계정에 캐릭터가 둘 있는지 확인한다', async () => {
      const 목록 = await 응답몸<{ id: number }[]>(await admin.get('/characters', { headers: 플레이어머리(나!) }));
      await verify('계정에 캐릭터가 둘 있다', 목록.length, 2, { blocker: true });
    });

    await test.step('둘째 캐릭터 번호를 X-Character-Id 로 주고 원장을 부른다', async () => {
      const 응답 = await admin.get('/currency/ledger?limit=50', { headers: 플레이어머리(둘째!) });
      await verify('원장 응답이 200 이다', 응답.status(), 200);
      const 원장 = await 응답몸<{ reason: string; delta: number }[]>(응답);
      const 둘째것 = await verify('원장에 둘째 캐릭터의 골드 변경이 있다', 원장.some((x) => x.reason === 'ADMIN_ADJUST' && x.delta === 더한골드), true);
      const 응답첫째 = await admin.get('/currency/ledger?limit=50', { headers: 플레이어머리(첫째!) });
      const 첫째원장 = await 응답몸<{ reason: string }[]>(응답첫째);
      const 첫째것 = await verify('첫째 캐릭터의 원장에는 그 골드 변경이 없다', 첫째원장.some((x) => x.reason === 'ADMIN_ADJUST'), false);
      await verify('둘째 캐릭터 번호를 X-Character-Id 로 주면 둘째 캐릭터의 원장이 온다', 둘째것 && 첫째것, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
