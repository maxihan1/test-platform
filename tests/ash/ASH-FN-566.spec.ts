import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 새계정, type 계정 } from './helpers/game-state.helper.js';
import { 거부됨, 계정찾기, 어드민열림, 정리앞머리, 정리응답 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-566',
  name: '2자 앞머리로 정리하면 거부되고 아무것도 지워지지 않는다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다', '3자 앞머리로 시작하는 새 계정이 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    허용길이: z.number().int().min(3).max(12).describe('정리를 받아들이는 앞머리 글자 수 — 3 이상 12 이하').default(3),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 새: 계정 | undefined;
  let 앞머리 = '';
  try {
    await test.step('2자 앞머리와 3자 앞머리로 시작하는 새 계정을 만든다', async () => {
      앞머리 = 정리앞머리(params.허용길이);
      새 = await 새계정(admin, 앞머리);
    });

    await test.step('어드민 키가 있고 앞머리로 시작하는 새 계정이 있는지 확인한다', async () => {
      await verify('어드민 키로 어드민 계정 목록을 부르면 200 이다', await 어드민열림(admin), 200, { blocker: true });
      const 목록 = await 계정찾기(admin, 앞머리);
      await verify('앞머리로 시작하는 새 계정이 있다', 목록.some((x) => x.username === 새!.아이디), true, { blocker: true });
    });

    await test.step('2자 앞머리로 정리를 부른다', async () => {
      const 응답 = await 정리응답(admin, 앞머리.slice(0, 2));
      const 거부 = await verify('2자 앞머리 정리 요청이 거부된다', 거부됨(응답), true);
      const 남음 = await verify('앞머리로 시작하는 새 계정이 그대로 있다', (await 계정찾기(admin, 앞머리)).some((x) => x.username === 새!.아이디), true);
      await verify('2자 앞머리로 정리하면 거부되고 아무것도 지워지지 않는다', 거부 && 남음, true);
    });

    await test.step('그 3자 앞머리로 정리를 부른다', async () => {
      const 응답 = await 정리응답(admin, 앞머리);
      const 코드 = await verify('정리 응답이 200 이다', 응답.status(), 200);
      const 사라짐 = await verify('앞머리로 시작하는 새 계정이 없다', (await 계정찾기(admin, 앞머리)).some((x) => x.username === 새!.아이디), false);
      await verify('3자 앞머리로 정리하면 그 계정이 지워진다', 코드 && 사라짐, true);
    });
  } finally {
    if (새 !== undefined) await 계정지우기(admin, 새);
  }
});
