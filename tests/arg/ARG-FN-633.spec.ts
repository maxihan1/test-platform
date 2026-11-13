import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-633',
  name: '메인 메뉴로 나갔다가 다시 로그인하고 길드 창을 열면 길드 이름 · 길드장 · 길드원 목록은 게임 API 에 저장되어 다시 접속해도 남는다',
  platforms: ['android'],
  precondition: ['길드에 들어가 있다'],
  techniques: ['상태 전이'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 골드를 다시 채우는 길 없음(운영 지급 API 경로가 가이드에 없어 길드 만들기 500 골드를 되풀이해 쓸 수 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('메인 메뉴로 나갔다가 다시 로그인하고 길드 창을 연다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('메인 메뉴로 나갔다가 다시 로그인하고 길드 창을 열면 길드 이름 · 길드장 · 길드원 목록은 게임 API 에 저장되어 다시 접속해도 남는다', await 있는지(game, 공통HUD.상단바), true);
  });
});
