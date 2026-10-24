import { defineCase, test, verify } from '@platform/kit';

import { 새캐릭터자리, 선공표시하기 } from './helpers/admin.helper.js';
import { 머리, 본문, type 캐릭터, type 캐릭터정보 } from './helpers/api.helper.js';
import { 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-484',
  name: 'GM 성향치를 50 · clearPurple true 로 주면 성향치가 50 이고 선공 표시가 지워진다',
  platforms: ['android'],
  precondition: ['선공 표시 중인 새 전사 캐릭터가 초록 들판에 있다'],
  elements: ['zone:Beginner', 'state:성향=보라'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn484', 'Beginner');
    });
    await test.step('새 전사 캐릭터가 선량한 봇을 먼저 공격해 선공 표시를 받는다', async () => {
      await 선공표시하기(request, admin, 누구!);
    });
    await test.step('새 전사 캐릭터의 선공 표시와 자리를 확인한다', async () => {
      const 정보 = await 캐릭터읽기(admin, 누구!);
      await verify('캐릭터가 선공 표시 중이다', 정보.alignment.state, 'Purple', { blocker: true });
      await verify('캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
    });
    await test.step('GM 으로 성향치 50 · clearPurple true 를 준다', async () => {
      const 나 = 누구!;
      await 본문<캐릭터정보>(await request.post('/gm/alignment', { headers: 머리(나), data: { value: 50, clearPurple: true } }), 'GM 성향치');
      const 정보 = await 캐릭터읽기(admin, 나);
      const 값 = await verify('성향치가 50 이다', 정보.alignment.value, 50);
      const 지워짐 = await verify('선공 표시가 없다', 정보.alignment.state, 'Innocent');
      await verify('GM 성향치를 50 · clearPurple true 로 주면 성향치가 50 이고 선공 표시가 지워진다', 값 && 지워짐, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
