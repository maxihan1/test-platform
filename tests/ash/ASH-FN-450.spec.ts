import { defineCase, test, verify } from '@platform/kit';

import { 봇처치, 새캐릭터자리, 죽은봇만들기 } from './helpers/admin.helper.js';
import { 오류, type 캐릭터 } from './helpers/api.helper.js';
import { 봇읽기, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-450',
  name: '죽은 봇 처치를 보고하면 409 「BOT_DEAD」다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판에 있다'],
  techniques: ['동등 분할', '상태 전이'],
  elements: ['zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  let 봇번호: number | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn450', 'Beginner');
    });
    await test.step('새 전사 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터가 초록 들판에 있다', (await 캐릭터읽기(admin, 누구!)).zone, 'Beginner', { blocker: true });
    });
    await test.step('봇 하나를 처치해 죽은 봇으로 만든다', async () => {
      봇번호 = (await 죽은봇만들기(request, admin, 누구!)).id;
    });
    await test.step('처치한 봇이 죽어 있는지 확인한다', async () => {
      await verify('처치한 봇이 죽어 있다', (await 봇읽기(admin, 누구!, 봇번호!)).isDead, true, { blocker: true });
    });
    await test.step('이미 죽은 봇 처치를 다시 보고한다', async () => {
      const 응답 = await 봇처치(request, 누구!, 봇번호!);
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 사유 = await verify('오류 코드가 「BOT_DEAD」다', (await 오류(응답)).code, 'BOT_DEAD');
      await verify('죽은 봇 처치를 보고하면 409 「BOT_DEAD」다', 코드 && 사유, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
