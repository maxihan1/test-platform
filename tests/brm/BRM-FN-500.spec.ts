import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { X버튼자리, 로그인화면준비, 오른쪽위인가, 톱니바퀴자리 } from './helpers/login-tools.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-500',
  name: '오른쪽 위 버튼을 보면 로그인 화면 오른쪽 위에 「X」 버튼과 톱니바퀴 버튼이 보인다',
  platforms: ['android'],
  precondition: ['로그인 화면이 떠 있다', '일반 회원으로 로비에 들어와 있다', '일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['state:접속=로그아웃', 'state:장소=로비', 'state:장소=던전'],
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
  await test.step('로그인 화면을 연다', async () => {
    await 로그인화면준비(game, driver);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('오른쪽 위 버튼을 본다', async () => {
    const 로그인X = await verify('로그인 화면의 「X」 버튼이 오른쪽 위에 있다', 오른쪽위인가(await X버튼자리(game)), true);
    const 로그인톱니 = await verify('로그인 화면의 톱니바퀴 버튼이 오른쪽 위에 있다', 오른쪽위인가(await 톱니바퀴자리(game)), true);
    await verify('오른쪽 위 버튼을 보면 로그인 화면 오른쪽 위에 「X」 버튼과 톱니바퀴 버튼이 보인다', 로그인X && 로그인톱니, true);
    await 로비로(game, driver, 나);
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
    const 로비X = await verify('로비의 「X」 버튼이 오른쪽 위에 있다', 오른쪽위인가(await X버튼자리(game)), true);
    const 로비톱니 = await verify('로비의 톱니바퀴 버튼이 오른쪽 위에 있다', 오른쪽위인가(await 톱니바퀴자리(game)), true);
    await verify('로비 오른쪽 위에도 「X」 버튼과 톱니바퀴 버튼이 보인다', 로비X && 로비톱니, true);
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
    const 던전X = await verify('던전의 「X」 버튼이 오른쪽 위에 있다', 오른쪽위인가(await X버튼자리(game)), true);
    const 던전톱니 = await verify('던전의 톱니바퀴 버튼이 오른쪽 위에 있다', 오른쪽위인가(await 톱니바퀴자리(game)), true);
    await verify('던전 오른쪽 위에도 「X」 버튼과 톱니바퀴 버튼이 보인다', 던전X && 던전톱니, true);
  });
});
