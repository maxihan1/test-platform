import { defineCase, test, verify } from '@platform/kit';

import { 본문, type 봇, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 보라봇만들기, 빨간봇만들기, 살아있는봇, 새캐릭터, 성향주기, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 봇처치 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-235',
  name: '보라 이름 봇을 처치하면 성향치가 그대로다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판에 있고 보라 이름 봇이 있다', '새 전사 캐릭터가 초록 들판에 있고 빨간 이름 봇이 있다'],
  elements: ['zone:Beginner', 'state:성향=보라', 'state:성향=악명'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 보라: 봇 | undefined;
  let 빨강: 봇 | undefined;
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판에 만든다', async () => {
      const 나 = await 새캐릭터(admin, 'qafn235');
      누구 = 나;
      await 순간이동(admin, 나, 'Beginner');
    });
    await test.step('보라 이름 봇을 만든다', async () => {
      const 선량 = await 살아있는봇(admin, 누구!, 'Beginner', 'Innocent');
      보라 = await 보라봇만들기(admin, 누구!, 선량);
    });
    await test.step('초록 들판에 보라 이름 봇이 있는지 확인한다', async () => {
      await verify('봇이 보라 이름이다', 보라!.alignment.state, 'Purple', { blocker: true });
    });
    await test.step('빨간 이름 봇을 만든다', async () => {
      const 선량 = await 살아있는봇(admin, 누구!, 'Beginner', 'Innocent');
      빨강 = await 빨간봇만들기(admin, 누구!, 선량);
      await 성향주기(admin, 누구!, 0);
      await 순간이동(admin, 누구!, 'Beginner');
    });
    await test.step('초록 들판에 빨간 이름 봇이 있는지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
      await verify('봇이 빨간 이름이다', 빨강!.alignment.state, 'Chaotic', { blocker: true });
    });
    await test.step('보라 이름 봇 처치를 보고한다', async () => {
      const 전 = (await 캐릭터정보받기(request, 누구!)).alignment.value;
      await 본문(await 봇처치(request, 누구!, 보라!), '봇 처치');
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('보라 이름 봇을 처치하면 성향치가 그대로다', 정보.alignment.value, 전);
    });
    await test.step('빨간 이름 봇 처치를 보고한다', async () => {
      const 전 = (await 캐릭터정보받기(request, 누구!)).alignment.value;
      await 본문(await 봇처치(request, 누구!, 빨강!), '봇 처치');
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('빨간 이름 봇을 처치하면 성향치가 그대로다', 정보.alignment.value, 전);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
