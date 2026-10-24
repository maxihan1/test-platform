import { defineCase, test, verify } from '@platform/kit';

import { 오류, 인증머리, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-339',
  name: '남의 캐릭터를 X-Character-Id 로 주면 403 「FORBIDDEN」이다',
  platforms: ['android'],
  precondition: ['두 계정에 새 캐릭터가 하나씩 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 나: 캐릭터 | undefined;
  let 남: 캐릭터 | undefined;
  try {
    await test.step('두 계정에 새 캐릭터를 하나씩 만든다', async () => {
      나 = await 새캐릭터(admin, 'qafn339');
      남 = await 새캐릭터(admin, 'qafn339');
    });
    await test.step('두 계정에 새 캐릭터가 하나씩 있는지 확인한다', async () => {
      const 내정보 = await 캐릭터정보받기(request, 나!);
      const 남정보 = await 캐릭터정보받기(request, 남!);
      await verify('두 계정에 새 캐릭터가 하나씩 있다', 내정보.id !== 남정보.id, true, { blocker: true });
    });
    await test.step('내 토큰에 남의 캐릭터 번호를 X-Character-Id 로 주고 상점 목록을 받는다', async () => {
      const 응답 = await request.get('/shop/items', { headers: { ...인증머리(나!), 'X-Character-Id': String(남!.번호) } });
      const 본문값 = await 오류(응답);
      const 상태 = await verify('응답 코드가 403 이다', 응답.status(), 403);
      const 코드 = await verify('오류 코드가 「FORBIDDEN」이다', 본문값.code, 'FORBIDDEN');
      await verify('남의 캐릭터를 X-Character-Id 로 주면 403 「FORBIDDEN」이다', 상태 && 코드, true);
    });
  } finally {
    if (나 !== undefined) await 캐릭터지우기(admin, 나);
    if (남 !== undefined) await 캐릭터지우기(admin, 남);
  }
});
