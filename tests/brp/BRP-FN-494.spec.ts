import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 같은자리인가, 오른쪽위인가, 자리읽기 } from './helpers/screen-check.helper.js';
import { 로비로되돌리기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 설정창 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-494',
  name: '로그인 화면 오른쪽 위를 읽으면 로그인 화면 오른쪽 위에 「X」 버튼과 소리 설정 톱니바퀴가 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원이 로그인 화면에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('방을 로비로 돌리기', () => 로비로되돌리기(admin));

  await 로그인화면.열림(game);
  await test.step('로그인 화면이 뜬 것을 확인한다', async () => {
    await verify('로그인 화면에 「게임 시작」 버튼이 보인다', (await game.find(로그인화면.게임시작)) !== null, true, { blocker: true });
  });

  const 로그인종료 = await 자리읽기(game, 설정창.종료버튼);
  const 로그인톱니 = await 자리읽기(game, 설정창.톱니버튼);
  await test.step('로그인 화면 오른쪽 위를 읽는다', async () => {
    const 종료 = await verify('「X」 버튼이 오른쪽 위에 있다', 오른쪽위인가(로그인종료), true);
    const 톱니 = await verify('소리 설정 톱니바퀴가 오른쪽 위에 있다', 오른쪽위인가(로그인톱니), true);
    await verify('로그인 화면 오른쪽 위를 읽으면 로그인 화면 오른쪽 위에 「X」 버튼과 소리 설정 톱니바퀴가 보인다', 종료 && 톱니, true);
  });

  await test.step('로그인해 로비 오른쪽 위를 읽는다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
    const 종료 = await verify('「X」 버튼이 로그인 화면과 같은 자리에 있다', 같은자리인가(로그인종료, await 자리읽기(game, 설정창.종료버튼)), true);
    const 톱니 = await verify('소리 설정 톱니바퀴가 로그인 화면과 같은 자리에 있다', 같은자리인가(로그인톱니, await 자리읽기(game, 설정창.톱니버튼)), true);
    await verify('로비에도 「X」 버튼과 톱니바퀴가 로그인 화면과 같은 자리에 보인다', 종료 && 톱니, true);
  });

  await test.step('던전에 들어가 오른쪽 위를 읽는다', async () => {
    await 던전입장(game, '탱커');
    const 종료 = await verify('「X」 버튼이 로그인 화면과 같은 자리에 있다', 같은자리인가(로그인종료, await 자리읽기(game, 설정창.종료버튼)), true);
    const 톱니 = await verify('소리 설정 톱니바퀴가 로그인 화면과 같은 자리에 있다', 같은자리인가(로그인톱니, await 자리읽기(game, 설정창.톱니버튼)), true);
    await verify('던전에도 「X」 버튼과 톱니바퀴가 로그인 화면과 같은 자리에 보인다', 종료 && 톱니, true);
  });
});
