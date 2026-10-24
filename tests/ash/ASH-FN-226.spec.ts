import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새계정, 캐릭터더하기, 캐릭터읽기, type 계정 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-226',
  name: '새 캐릭터를 만들면 성향 상태가 「Innocent」다',
  platforms: ['android'],
  precondition: ['로그인한 계정이 있다'],
  elements: ['state:성향=선량'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 가입한: 계정 | undefined;
  try {
    await test.step('계정을 만들어 로그인한다', async () => {
      가입한 = await 새계정(admin, 'zqa226');
    });

    await test.step('로그인한 계정이 있는지 확인한다', async () => {
      await verify('로그인한 계정의 토큰이 있다', 가입한!.토큰.length > 0, true, { blocker: true });
    });

    await test.step('새 캐릭터를 만든다', async () => {
      const 새것 = await 캐릭터더하기(admin, 가입한!);
      await verify('새 캐릭터를 만들면 성향 상태가 「Innocent」다', (await 캐릭터읽기(admin, 새것)).alignment.state, 'Innocent');
    });
  } finally {
    if (가입한 !== undefined) await 계정지우기(admin, 가입한);
  }
});
