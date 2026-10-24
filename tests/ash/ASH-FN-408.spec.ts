import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 새계정, 오류코드, 임의글자, type 계정 } from './helpers/game-state.helper.js';
import { 캐릭터만들기응답, 캐릭터수 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-408',
  name: '캐릭터를 계속 만들면 정해 둔 수 안에서 409 「CHARACTER_LIMIT」이 온다',
  platforms: ['android'],
  precondition: ['캐릭터가 없는 새 계정이 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    최대횟수: z.number().int().min(1).max(50).describe('거부될 때까지 만들어 볼 최대 횟수 — 서버의 계정당 캐릭터 한도보다 크게').default(20),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 계정 | undefined;
  try {
    await test.step('캐릭터가 없는 새 계정을 만든다', async () => {
      나 = await 새계정(admin, 'zqa408');
    });

    await test.step('계정에 캐릭터가 없는지 확인한다', async () => {
      await verify('캐릭터가 없는 새 계정이 있다', await 캐릭터수(admin, 나!.아이디), 0, { blocker: true });
    });

    await test.step('거부될 때까지 캐릭터를 만든다', async () => {
      let 마지막 = await 캐릭터만들기응답(admin, 나!, `zq${임의글자(8)}`);
      for (let i = 1; i < params.최대횟수 && 마지막.status() === 201; i += 1) {
        마지막 = await 캐릭터만들기응답(admin, 나!, `zq${임의글자(8)}`);
      }
      const 거부 = await verify('정해 둔 수 안에서 캐릭터 만들기가 거부된다', 마지막.status() !== 201, true);
      const 코드 = await verify('응답 코드가 409 다', 마지막.status(), 409);
      const 이름 = await verify('오류 코드가 「CHARACTER_LIMIT」이다', await 오류코드(마지막), 'CHARACTER_LIMIT');
      await verify('캐릭터를 계속 만들면 정해 둔 수 안에서 409 「CHARACTER_LIMIT」이 온다', 거부 && 코드 && 이름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
