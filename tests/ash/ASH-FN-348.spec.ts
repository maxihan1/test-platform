import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 바꾸기, 새캐릭터, 오류코드, 임의글자, 장비빼고비우기, 캐릭터읽기, 플레이어머리, type 캐릭터 } from './helpers/game-state.helper.js';
import { 가입된수 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-348',
  held: '보류 — 검증 실패: 오류 코드가 「VALIDATION_FAILED」다',
  name: '수량을 글자로 주면 400 「VALIDATION_FAILED」다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 골드를 넉넉히 가지고 있다', '가입하지 않은 아이디가 있다'],
  techniques: ['동등 분할'],
  elements: ['item:potion_hp_s', 'flow:골드-상점구매'],
  params: z.object({
    수량글자: z.string().min(1).describe('수량 자리에 넣을 글자 — 숫자로 읽히지 않는 글자').default('abc'),
    숫자아이디: z.number().int().min(10000000).max(99999999).describe('아이디 자리에 넣을 숫자 — 8자리 숫자').default(48271635),
  }),
  expected: null,
});

test(spec, async ({ admin, request, params }) => {
  let 나: 캐릭터 | undefined;
  let 만든계정: string | undefined;
  try {
    await test.step('골드를 넉넉히 가진 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa348');
      await 장비빼고비우기(admin, 나);
      await 바꾸기(admin, 나, { gold: 1_000_000 });
    });

    await test.step('새 캐릭터가 골드를 넉넉히 가지고 있는지 확인한다', async () => {
      await verify('새 캐릭터가 골드를 넉넉히 가지고 있다', (await 캐릭터읽기(admin, 나!)).gold, 1_000_000, { blocker: true });
    });

    await test.step('수량을 글자로 주고 빨간 물약을 산다', async () => {
      const 응답 = await admin.post('/shop/buy', { headers: 플레이어머리(나!), data: { templateId: 'potion_hp_s', quantity: params.수량글자 } });
      const 코드 = await verify('응답 코드가 400 이다', 응답.status(), 400);
      const 이름 = await verify('오류 코드가 「VALIDATION_FAILED」다', await 오류코드(응답), 'VALIDATION_FAILED');
      await verify('수량을 글자로 주면 400 「VALIDATION_FAILED」다', 코드 && 이름, true);
    });

    await test.step('가입하지 않은 아이디가 있는지 확인한다', async () => {
      await verify('가입하지 않은 아이디가 있다', await 가입된수(admin, String(params.숫자아이디)), 0, { blocker: true });
    });

    await test.step('아이디를 숫자로 주고 가입한다', async () => {
      const 응답 = await request.post('/auth/signup', { data: { username: params.숫자아이디, password: 임의글자(12) } });
      if (응답.status() === 201) 만든계정 = String(params.숫자아이디);
      const 코드 = await verify('숫자 아이디의 응답 코드가 400 이다', 응답.status(), 400);
      const 이름 = await verify('숫자 아이디의 오류 코드가 「VALIDATION_FAILED」다', await 오류코드(응답), 'VALIDATION_FAILED');
      await verify('아이디를 숫자 값으로 주고 가입하면 400 「VALIDATION_FAILED」다', 코드 && 이름, true);
    });
  } finally {
    if (만든계정 !== undefined) await 계정지우기(admin, 만든계정);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
