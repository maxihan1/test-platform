import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창 } from './components/popup.component.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 점검끄기, 점검바꾸기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-051',
  name: '점검으로 서버가 내보내면 「다시 연결하는 중…」 없이 안내 창을 띄우고 로그인 화면으로 돌아간다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('점검 끄기', () => 점검끄기(admin));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('허용 계정 없는 점검을 켜고 서버가 내보낼 때까지 기다린 뒤 안내 창 「확인」을 누른다', async () => {
    await 점검바꾸기(admin, { enabled: true, message: '[QA] 점검 안내 문구', allowedAccountIds: [] });
    const 창 = new 안내창(game);
    const 떴다 = await verify('안내 창이 뜬다', await 창.뜰때까지(60_000), true);
    const 글 = `${await 창.제목()} ${await 창.본문()}`;
    const 재연결없음 = await verify('안내 창에 「다시 연결하는 중…」이 들어 있지 않다', 글.includes('다시 연결하는 중…'), false);
    await 창.확인누르기();
    const 로그인뜸 = await verify('로그인 화면으로 돌아간다', await game.waitFor(로그인화면.게임시작, { timeoutMs: 20_000 }).then(() => true, () => false), true);
    await verify('점검으로 서버가 내보내면 「다시 연결하는 중…」 없이 안내 창을 띄우고 로그인 화면으로 돌아간다', 떴다 && 재연결없음 && 로그인뜸, true);
  });
});
