import { defineCase, test, verify } from '@platform/kit';

import { 본문, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 살아있는봇, 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { PK공격 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-219',
  name: '성향치 0 인 선공 표시 캐릭터의 상태는 「Purple」이다',
  platforms: ['android'],
  precondition: ['선공 표시 중인 새 전사 캐릭터가 초록 들판에 있다'],
  techniques: ['상태 전이'],
  elements: ['zone:Beginner', 'state:성향=보라'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 가해: 캐릭터 | undefined;
  try {
    await test.step('선공 표시 중인 새 전사 캐릭터를 초록 들판에 만든다', async () => {
      const 가 = await 새캐릭터(admin, 'qafn219');
      가해 = 가;
      await 순간이동(admin, 가, 'Beginner');
      await 본문(await PK공격(request, 가, await 살아있는봇(admin, 가, 'Beginner', 'Innocent')), '선공');
    });
    await test.step('캐릭터가 선공 표시 중으로 초록 들판에 있는지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 가해!);
      await verify('캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
      await verify('캐릭터가 선공 표시 중이다', 정보.alignment.state, 'Purple', { blocker: true });
    });
    await test.step('캐릭터 정보를 받는다', async () => {
      const 정보 = await 캐릭터정보받기(request, 가해!);
      await verify('성향치 0 인 선공 표시 캐릭터의 상태는 「Purple」이다', 정보.alignment.state, 'Purple');
    });
  } finally {
    if (가해 !== undefined) await 캐릭터지우기(admin, 가해);
  }
});
