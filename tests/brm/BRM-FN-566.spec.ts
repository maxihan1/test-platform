import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-566',
  name: '왼쪽 위 초상화를 보면 던전 왼쪽 위 초상화에 내 영웅 얼굴 · 이름 「qa_player1」 · 체력 막대가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('일반 회원이 혼자 던전에 들어간다', async () => {
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('왼쪽 위 초상화를 본다', async () => {
    const 던전 = await 던전화면.열기(game);
    const 얼굴 = await verify('내 영웅 얼굴이 보인다', await 던전.보임(던전화면.내얼굴), true);
    const 이름 = await verify('이름 「qa_player1」이 보인다', await 던전.내이름(), 나.아이디);
    const 체력 = await verify('체력 막대가 보인다', await 던전.보임(던전화면.내체력막대), true);
    await verify('왼쪽 위 초상화를 보면 던전 왼쪽 위 초상화에 내 영웅 얼굴 · 이름 「qa_player1」 · 체력 막대가 보인다', 얼굴 && 이름 && 체력, true);
  });
});
