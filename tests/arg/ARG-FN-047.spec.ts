import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 계정되돌리기, 실패걸기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-047',
  name: '캐릭터 불러오기에 실패하면 「캐릭터 정보를 불러오지 못했습니다」 오류 알림이 뜬다',
  platforms: ['android'],
  precondition: ['다음 캐릭터 불러오기 요청이 실패하도록 걸어 두었다'],
  techniques: ['동등 분할'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 캐릭터 불러오기 요청이 실패하도록 걸어 둔다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      화면 = await 로그인화면.열기(game);
      await 화면.아이디넣기(아이디);
      await 화면.비밀번호넣기(비밀번호);
      await 실패걸기(admin, '/api/getplayercharacters');
    });
    await test.step('로그인 화면을 확인한다', async () => {
      await verify('로그인 화면에 「게임 시작」 버튼이 보인다', await 화면.보이나(로그인화면.게임시작), true, { blocker: true });
    });

    await test.step('캐릭터 불러오기가 실패하는 때에 로그인한다', async () => {
      await 화면.게임시작누르기();
      const 떴다 = await new 공통HUD(game).알림기다리기('캐릭터 정보를 불러오지 못했습니다', 30_000);
      await verify('캐릭터 불러오기에 실패하면 「캐릭터 정보를 불러오지 못했습니다」 오류 알림이 뜬다', 떴다, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
