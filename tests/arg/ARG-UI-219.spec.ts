import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 친구창 } from './pages/friends.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-219',
  name: '친구 목록에 접속하지 않은 친구가 회색 점과 「Lv.<레벨> · 오프라인」으로 보인다',
  platforms: ['android'],
  precondition: ['접속하지 않은 친구 「qa_player2」가 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    친구이름: z.string().min(1).describe('확인할 친구 이름 — 접속하지 않은 친구의 캐릭터 이름').default('qa_player2'),
  }),
  expected: z.object({
    점색: z.string().describe('접속하지 않은 친구 점 색').default('#6B6458'),
    접속글: z.string().describe('접속하지 않은 친구 줄 글자').default('오프라인'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면의 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('친구 · 파티 창을 연다', async () => {
    const 창 = await 친구창.열기(game);
    await verify('친구 목록에 친구 줄이 보인다', await 창.줄뜨는지(params.친구이름), true, { blocker: true });
    const 줄 = (await 창.줄원문(params.친구이름)) ?? '';
    const 점 = await verify('친구 줄 앞에 회색 점이 보인다', 줄.includes(`<color=${expected.점색}>●</color>`), true);
    const 레벨 = await verify('친구 줄에 「Lv.<레벨> · 오프라인」이 보인다', new RegExp(`Lv\\.\\d+ · ${expected.접속글}`).test(줄), true);
    await verify('친구 목록에 접속하지 않은 친구가 회색 점과 「Lv.<레벨> · 오프라인」으로 보인다', 점 && 레벨, true);
  });
});
