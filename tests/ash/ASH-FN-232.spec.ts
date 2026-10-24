import { defineCase, test, verify } from '@platform/kit';

import { 본문, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 살아있는봇, 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 봇처치 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-232',
  name: '선량한 봇을 처치하면 성향치가 300 내려간다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판에 있다'],
  elements: ['zone:Beginner', 'state:성향=악명', 'move:성향 선량→악명'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판에 만든다', async () => {
      const 나 = await 새캐릭터(admin, 'qafn232');
      누구 = 나;
      await 순간이동(admin, 나, 'Beginner');
    });
    await test.step('새 캐릭터가 초록 들판에 있는지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
    });
    await test.step('선량한 봇 처치를 보고한다', async () => {
      const 봇값 = await 살아있는봇(admin, 누구!, 'Beginner', 'Innocent');
      await 본문(await 봇처치(request, 누구!, 봇값), '봇 처치');
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('선량한 봇을 처치하면 성향치가 300 내려간다', 정보.alignment.value, -300);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
