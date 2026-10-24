import { defineCase, test, verify } from '@platform/kit';

import { type 계정, 본문, 새계정, 인증머리, type 캐릭터, 캐릭터만들기 } from './helpers/api.helper.js';
import { 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-391',
  name: '내 캐릭터 목록을 받으면 내 캐릭터 둘이 온다',
  platforms: ['android'],
  precondition: ['한 계정에 새 캐릭터 둘이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 첫째: 캐릭터 | undefined;
  let 둘째: 캐릭터 | undefined;
  let 계정: 계정 | undefined;
  try {
    await test.step('한 계정에 새 캐릭터 둘을 만든다', async () => {
      const 본인 = await 새계정(request, 'qafn391');
      계정 = 본인;
      첫째 = await 캐릭터만들기(request, 본인, 'Warrior');
      둘째 = await 캐릭터만들기(request, 본인, 'Warrior');
    });
    await test.step('캐릭터 둘이 한 계정에 있는지 확인한다', async () => {
      const 목록 = await 본문<{ id: number }[]>(await request.get('/characters', { headers: 인증머리(계정!) }), '캐릭터 목록');
      await verify('계정의 캐릭터가 둘이다', 목록.length, 2, { blocker: true });
    });
    await test.step('내 캐릭터 목록을 받는다', async () => {
      const 목록 = await 본문<{ id: number }[]>(await request.get('/characters', { headers: 인증머리(계정!) }), '캐릭터 목록');
      const 번호들 = 목록.map((c) => c.id).sort((a, b) => a - b);
      const 둘이다 = await verify('목록에 캐릭터가 둘이다', 목록.length, 2);
      const 내것이다 = await verify('목록의 캐릭터 번호가 내가 만든 둘과 같다', 번호들, [첫째!.번호, 둘째!.번호].sort((a, b) => a - b));
      await verify('내 캐릭터 목록을 받으면 내 캐릭터 둘이 온다', 둘이다 && 내것이다, true);
    });
  } finally {
    if (계정 !== undefined) await 캐릭터지우기(admin, 계정);
  }
});
