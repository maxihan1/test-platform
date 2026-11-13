import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 새로접속, 전체채팅보내기 } from './helpers/social-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-247',
  name: '채팅 창에서 「파티」 탭을 누르면 「[전체]」 줄이 보이지 않고 「[알림]」 줄은 보인다',
  platforms: ['android'],
  precondition: ['전체 채팅을 한 줄 보낸 뒤 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    보낼글: z.string().describe('보낼 채팅 글 — 100자 이하 아무 글').default('qa 확인'),
  }),
  expected: z.object({
    전체말머리: z.string().describe('전체 줄 머리말').default('[전체]'),
    알림말머리: z.string().describe('알림 줄 머리말').default('[알림]'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  let 창: 채팅창;

  await test.step('일반 회원으로 로비에 들어가 전체 채팅을 한 줄 보낸다', async () => {
    const 대기실 = await 새로접속(game, params.loginId ?? '', params.loginPassword ?? '');
    창 = await 채팅창.열기(game);
    await 전체채팅보내기(창, params.보낼글);
    const 줄들 = await 창.줄글들();
    await verify('보낸 글이 채팅 창에 보인다', 줄들.some((줄) => 줄.includes(params.보낼글)), true, { blocker: true });
    await verify('로비 화면의 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('채팅 창에서 「파티」 탭을 누른다', async () => {
    await 창.탭누르기('파티');
    await 창.줄사라지는지(params.보낼글);
    const 줄들 = await 창.줄글들();
    const 전체없음 = await verify('「파티」 탭에 「[전체]」 줄이 보이지 않는다', 줄들.some((줄) => 줄.startsWith(expected.전체말머리)), false);
    const 알림있음 = await verify('「파티」 탭에 「[알림]」 줄이 보인다', 줄들.some((줄) => 줄.startsWith(expected.알림말머리)), true);
    await verify('채팅 창에서 「파티」 탭을 누르면 「[전체]」 줄이 보이지 않고 「[알림]」 줄은 보인다', 전체없음 && 알림있음, true);
  });
});
