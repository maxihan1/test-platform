import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 새로접속, 전체채팅보내기 } from './helpers/social-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-184',
  name: '채팅 띠의 「[전체]」 줄은 #F2ECE0, 「[알림]」 줄은 #FFD152 색으로 보인다',
  platforms: ['android'],
  precondition: ['전체 채팅을 한 줄 보낸 뒤 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    보낼글: z.string().describe('보낼 채팅 글 — 100자 이하 아무 글').default('qa 확인'),
  }),
  expected: z.object({
    전체색: z.string().describe('채팅 띠 「[전체]」 줄 색').default('#F2ECE0'),
    알림색: z.string().describe('채팅 띠 「[알림]」 줄 색').default('#FFD152'),
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
    await 창.닫기누르기();
    await verify('로비 화면의 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('채팅 띠의 줄 색을 확인한다', async () => {
    await 창.띠에뜨는지('[전체]');
    const 띠글 = await 창.hud.채팅띠글();
    const 전체 = await verify('채팅 띠의 「[전체]」 줄이 #F2ECE0 색으로 보인다', 띠글.includes(`<color=${expected.전체색}>[전체]`), true);
    const 알림 = await verify('채팅 띠의 「[알림]」 줄이 #FFD152 색으로 보인다', 띠글.includes(`<color=${expected.알림색}>[알림]`), true);
    await verify('채팅 띠의 「[전체]」 줄은 #F2ECE0, 「[알림]」 줄은 #FFD152 색으로 보인다', 전체 && 알림, true);
  });
});
