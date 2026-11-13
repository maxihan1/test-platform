import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-567',
  name: '31줄을 보내면 채팅 창에는 최근 30줄만 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    보낼글: z.string().describe('보낼 채팅 글 — 줄마다 뒤에 번호를 붙인다. 90자 이하 아무 글').default('qa 확인'),
    보낼줄수: z.number().int().min(2).describe('전체 탭으로 보낼 줄 수 — 한도 30줄보다 1줄 많은 31줄').default(31),
  }),
  expected: z.object({
    보이는줄수: z.number().describe('채팅 창에 보이는 줄 수').default(30),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면의 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('전체 탭에서 글 31줄을 차례로 보낸다', async () => {
    const 창 = await 채팅창.열기(game);
    await 창.탭누르기('전체');
    for (let 번호 = 1; 번호 <= params.보낼줄수; 번호 += 1) {
      await 창.보내기하기(`${params.보낼글} ${String(번호)}`);
    }
    await 창.새줄이뜨는지(채팅창.최대줄, `${params.보낼글} ${String(params.보낼줄수)}`, 30_000);
    await verify('31줄을 보내면 채팅 창에는 최근 30줄만 보인다', await 창.줄수(), expected.보이는줄수);
  });
});
