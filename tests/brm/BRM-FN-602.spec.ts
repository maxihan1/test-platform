import { defineCase, test, verify } from '@platform/kit';
import { 폰상태에서 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인화면준비, 안내창읽기 } from './helpers/login-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-602',
  name: '서버에 닿지 못하면 「접속 실패」 창에 「서버에 연결하지 못했습니다. 네트워크를 확인해 주세요」가 보인다',
  platforms: ['android'],
  precondition: ['와이파이가 꺼져 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  await test.cleanup('켜 둔 봇 끄기', () => 봇모두끄기(admin));
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.step('로그인 화면을 열고 아이디와 비밀번호를 넣는다', async () => {
    await 로그인화면준비(game, driver);
    const 화면 = await 로그인화면.열기(game);
    await 화면.아이디넣기(나.아이디);
    await 화면.비밀번호넣기(나.비밀번호);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('일반 회원 계정으로 「게임 시작」을 누른다', async () => {
    const 창 = await 폰상태에서(driver, { 네트워크: '끊김' }, async () => {
      const 화면 = await 로그인화면.열기(game);
      await 화면.시작누르기();
      return 안내창읽기(game, 60_000);
    });
    await verify('접속 안내 창이 뜬다', 창 !== null, true, { blocker: true });
    const 제목 = await verify('창 제목이 「접속 실패」다', 창?.제목 ?? '', '접속 실패');
    const 본문 = await verify('창 본문이 「서버에 연결하지 못했습니다. 네트워크를 확인해 주세요」다', 창?.본문 ?? '', '서버에 연결하지 못했습니다. 네트워크를 확인해 주세요');
    await verify('서버에 닿지 못하면 「접속 실패」 창에 「서버에 연결하지 못했습니다. 네트워크를 확인해 주세요」가 보인다', 제목 && 본문, true);
  });
});
