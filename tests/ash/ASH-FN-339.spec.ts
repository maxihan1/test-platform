import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새계정, 새캐릭터, 오류코드, 캐릭터읽기, 플레이어머리, type 계정, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-339',
  name: '남의 캐릭터 번호를 X-Character-Id 로 주면 403 「FORBIDDEN」이다',
  platforms: ['android'],
  precondition: ['로그인한 계정과 다른 계정의 캐릭터가 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 계정 | undefined;
  let 남: 캐릭터 | undefined;
  try {
    await test.step('로그인한 계정과 다른 계정의 캐릭터를 만든다', async () => {
      나 = await 새계정(admin, 'zqa339');
      남 = await 새캐릭터(admin, 'zqa339');
    });

    await test.step('다른 계정의 캐릭터가 있는지 확인한다', async () => {
      await verify('다른 계정의 캐릭터가 있다', (await 캐릭터읽기(admin, 남!)).id, 남!.id, { blocker: true });
      await verify('로그인한 계정이 다른 계정과 다르다', 나!.아이디 !== 남!.아이디, true, { blocker: true });
    });

    await test.step('남의 캐릭터 번호를 X-Character-Id 로 주고 상점 목록을 부른다', async () => {
      const 응답 = await admin.get('/shop/items', { headers: { authorization: `Bearer ${나!.토큰}`, 'x-character-id': String(남!.id) } });
      const 코드 = await verify('응답 코드가 403 이다', 응답.status(), 403);
      const 이름 = await verify('오류 코드가 「FORBIDDEN」다', await 오류코드(응답), 'FORBIDDEN');
      await verify('남의 캐릭터 번호를 X-Character-Id 로 주면 403 「FORBIDDEN」이다', 코드 && 이름, true);
    });

    await test.step('남의 캐릭터 번호로 캐릭터를 읽는다', async () => {
      const 응답 = await admin.get(`/characters/${String(남!.id)}`, { headers: 플레이어머리(나!) });
      const 코드 = await verify('남의 캐릭터를 읽은 응답 코드가 403 이다', 응답.status(), 403);
      const 이름 = await verify('남의 캐릭터를 읽은 오류 코드가 「FORBIDDEN」다', await 오류코드(응답), 'FORBIDDEN');
      await verify('남의 캐릭터 번호로 캐릭터를 읽으면 403 「FORBIDDEN」이다', 코드 && 이름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
    if (남 !== undefined) await 계정지우기(admin, 남);
  }
});
