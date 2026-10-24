import { defineCase, test, verify } from '@platform/kit';

import { 삭제포함찾기, 새캐릭터자리 } from './helpers/admin.helper.js';
import { 인증머리, type 캐릭터 } from './helpers/api.helper.js';
import { 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-412',
  name: '지운 캐릭터 이름으로 다시 만들면 201 이다',
  platforms: ['android'],
  precondition: ['새 캐릭터를 지운 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn412');
    });
    await test.step('새 캐릭터를 지운다', async () => {
      const 나 = 누구!;
      await request.delete(`/characters/${String(나.번호)}`, { headers: 인증머리(나) });
    });
    await test.step('지운 캐릭터가 지워졌는지 확인한다', async () => {
      const 나 = 누구!;
      const 찾은 = (await 삭제포함찾기(admin, 나.이름)).find((c) => c.id === 나.번호);
      await verify('새 캐릭터를 지운 계정이 있다', 찾은?.deleted, true, { blocker: true });
    });
    await test.step('지운 캐릭터 이름으로 새 캐릭터를 만든다', async () => {
      const 나 = 누구!;
      const 응답 = await request.post('/characters', { headers: 인증머리(나), data: { name: 나.이름, classType: 'Warrior', gender: 'Male' } });
      await verify('지운 캐릭터 이름으로 다시 만들면 201 이다', 응답.status(), 201);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
