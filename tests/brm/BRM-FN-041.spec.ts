import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면준비, 시작시도, 틀린비밀번호, 화면자리 } from './helpers/login-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 안내창 } from './pages/popup.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-041',
  name: '접속 거절 안내 창이 뜨면 화면 가운데에 버튼은 「확인」 하나만 보인다',
  platforms: ['android'],
  precondition: ['로그인 화면이 떠 있다'],
  elements: ['state:접속=로그아웃'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  await test.cleanup('켜 둔 봇 끄기', () => 봇모두끄기(admin));
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.step('로그인 화면을 연다', async () => {
    await 로그인화면준비(game, driver);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('틀린 비밀번호로 접속 안내 창을 띄운다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 시작시도(화면, 나, 틀린비밀번호(나));
    const 안내 = await 안내창.뜰때까지(game, 30_000);
    await verify('접속 안내 창이 뜬다', 안내 !== null, true, { blocker: true });
    if (안내 === null) return;
    const 자리 = await 화면자리(game, 안내창.창);
    const 가운데 = await verify('안내 창이 화면 가운데에 있다', 자리?.가운데가로 === true && 자리.가운데세로, true);
    const 확인 = await verify('버튼 「확인」이 보인다', await 안내.확인버튼글(), '확인');
    const 하나뿐 = await verify('다른 버튼은 보이지 않는다', await 안내.다른버튼있나(), false);
    const 배치 = await game.layout(안내창.창);
    await verify('안내 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
    await verify('접속 거절 안내 창이 뜨면 화면 가운데에 버튼은 「확인」 하나만 보인다', 가운데 && 확인 && 하나뿐, true);
  });
});
