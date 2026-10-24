import { defineCase, test, verify } from '@platform/kit';

import { type 봇, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 살아있는봇, 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { PK공격 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-244',
  name: '마을 밖에서 선량한 봇을 공격하면 공격이 받아들여진다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판에 있다'],
  elements: ['zone:Beginner', 'state:구역=필드'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 가해: 캐릭터 | undefined;
  let 대상: 봇 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판에 만든다', async () => {
      const 가 = await 새캐릭터(admin, 'qafn244');
      가해 = 가;
      await 순간이동(admin, 가, 'Beginner');
      대상 = await 살아있는봇(admin, 가, 'Beginner', 'Innocent');
    });
    await test.step('캐릭터가 초록 들판에 있고 선량한 봇이 있는지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 가해!);
      await verify('공격하는 캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
      await verify('공격받을 봇이 선량하다', 대상?.alignment.state, 'Innocent', { blocker: true });
    });
    await test.step('마을 밖에서 선량한 봇을 공격한다', async () => {
      const 응답 = await PK공격(request, 가해!, 대상!);
      await verify('마을 밖에서 선량한 봇을 공격하면 공격이 받아들여진다', 응답.ok(), true);
    });
  } finally {
    if (가해 !== undefined) await 캐릭터지우기(admin, 가해);
  }
});
