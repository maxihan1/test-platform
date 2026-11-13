import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림 } from './components/toast.component.js';
import { 파티없음확인 } from './helpers/social-state.helper.js';
import { 뜨는지 } from './helpers/find.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-271',
  name: '오류 알림을 4개 띄우면 알림 4개가 모두 보인다',
  platforms: ['android'],
  precondition: ['파티가 없고 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    보낼글: z.string().describe('보낼 채팅 글 — 100자 이하 아무 글').default('qa 확인'),
    한도알림수: z.number().int().min(1).describe('오류 알림을 띄우는 횟수 — 알림 한도 4개').default(4),
    넘는알림수: z.number().int().min(2).describe('오류 알림을 띄우는 총 횟수 — 알림 한도보다 1개 많은 5개').default(5),
  }),
  expected: z.object({
    보이는알림수: z.number().describe('보이는 알림 개수').default(4),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ game, params, expected }) => {
  let 창: 채팅창;

  await test.step('일반 회원으로 로비에 들어가 파티가 없는지 확인한다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('친구 · 파티 창에 「파티 없음」 줄이 보인다', await 파티없음확인(game), true, { blocker: true });
  });

  await test.step('파티 탭에서 4번 보내 오류 알림 4개를 띄운다', async () => {
    창 = await 채팅창.열기(game);
    await 창.탭누르기('파티');
    await 창.글넣기(params.보낼글);
    await 창.보내기여러번누르기(params.한도알림수);
    await 뜨는지(game, `${알림.상자}/Toast[${String(params.한도알림수 - 1)}]`);
    await verify('오류 알림을 4개 띄우면 알림 4개가 모두 보인다', await 창.hud.알림.개수(), expected.보이는알림수);
  });

  await test.step('파티 탭에서 한 번 더 보내 오류 알림 5개째를 띄운다', async () => {
    await 창.보내기여러번누르기(params.넘는알림수 - params.한도알림수);
    await verify('알림이 5개째 떠도 보이는 알림은 4개다', await 창.hud.알림.개수(), expected.보이는알림수);
  });
});
