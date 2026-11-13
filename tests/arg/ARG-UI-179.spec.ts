import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 새로접속 } from './helpers/social-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-179',
  name: '채팅 창에 「전체」 · 「파티」 · 「길드」 탭과 「[알림]」 줄이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    전체탭: z.string().describe('전체 탭 글자').default('전체'),
    파티탭: z.string().describe('파티 탭 글자').default('파티'),
    길드탭: z.string().describe('길드 탭 글자').default('길드'),
    알림말머리: z.string().describe('알림 줄 머리말').default('[알림]'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 새로접속(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면의 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('채팅 창을 연다', async () => {
    const 창 = await 채팅창.열기(game);
    await 창.첫줄뜨는지();
    const 전체 = await verify('채팅 창에 「전체」 탭이 보인다', await 창.탭글('전체'), expected.전체탭);
    const 파티 = await verify('채팅 창에 「파티」 탭이 보인다', await 창.탭글('파티'), expected.파티탭);
    const 길드 = await verify('채팅 창에 「길드」 탭이 보인다', await 창.탭글('길드'), expected.길드탭);
    const 줄들 = await 창.줄글들();
    const 알림줄 = await verify('채팅 창에 「[알림]」 줄이 보인다', 줄들.some((줄) => 줄.startsWith(expected.알림말머리)), true);
    await verify('채팅 창에 「전체」 · 「파티」 · 「길드」 탭과 「[알림]」 줄이 보인다', 전체 && 파티 && 길드 && 알림줄, true);
  });
});
