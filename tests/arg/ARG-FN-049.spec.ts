import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 우편보내기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-049',
  name: '안 읽은 우편이 있는 계정으로 로그인하면 메뉴에 「우편 1」이 보인다',
  held: '보류 — 일반 회원 우편함에 받지도 지우지도 못하는 「알 수 없는 아이템」 우편 2통(ARG-FN-202 · ARG-FN-210 이 넣은 것)이 남아 우편 수 · 빈 우편함을 만들 수 없다',
  platforms: ['android'],
  precondition: ['일반 회원에게 안 읽은 우편 1통을 보내 두었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    let 화면 = 로그인화면.지금(game);
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 안 읽은 우편 1통을 보낸다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편보내기(admin, 아이디, { 제목: '자동 시험 우편' });
      화면 = await 로그인화면.열기(game);
    });
    await test.step('로그인 화면을 확인한다', async () => {
      await verify('로그인 화면에 「게임 시작」 버튼이 보인다', await 화면.보이나(로그인화면.게임시작), true, { blocker: true });
    });

    await test.step('일반 회원으로 로그인한다', async () => {
      await 로비로(game, 아이디, 비밀번호);
      await game.waitFor(`${공통HUD.메뉴버튼('우편')}/Text`, { text: '우편 1', timeoutMs: 10_000 }).catch(() => undefined);
      await verify('안 읽은 우편이 있는 계정으로 로그인하면 메뉴에 「우편 1」이 보인다', await new 공통HUD(game).우편메뉴글(), '우편 1');
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
