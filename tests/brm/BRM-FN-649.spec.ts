import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 감정표현막대 } from './pages/emote-bar.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-649',
  name: '「감정」 버튼을 눌러 감정 표현 막대를 열면 「CHEER」 · 「DANCE」 · 「WAVE」 · 「SIT」 버튼 넷이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['state:장소=던전'],
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
    await verify('던전 행동 막대가 보인다', await 던전화면.열기(game).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「감정」 버튼을 눌러 감정 표현 막대를 연다', async () => {
    const 막대 = await 감정표현막대.열기(game);
    await verify('「감정」 버튼을 눌러 감정 표현 막대를 열면 「CHEER」 · 「DANCE」 · 「WAVE」 · 「SIT」 버튼 넷이 보인다', await 막대.버튼글들(), ['CHEER', 'DANCE', 'WAVE', 'SIT']);
    await verify('감정 표현 막대 버튼 아래에 키 번호 「5」 · 「6」 · 「7」 · 「8」이 보인다', await 막대.키번호들(), ['5', '6', '7', '8']);
    const 배치 = await game.layout(감정표현막대.판);
    await verify('감정 표현 막대의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
  });
});
