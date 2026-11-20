import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면준비, 시작시도, 안내창읽기 } from './helpers/login-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇켜기, 접속자 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-036',
  name: '같은 계정이 이미 접속해 있을 때 「게임 시작」을 누르면 「접속 실패」 창에 「같은 계정으로 이미 접속 중입니다. 다른 기기의 접속을 끊고 다시 시도해 주세요」가 보인다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  precondition: ['일반 회원 계정으로 봇이 접속해 있다'],
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
  await test.step('일반 회원 계정으로 봇을 켠다', async () => {
    await 봇켜기(admin, 나);
    const 접속 = (await 접속자(admin)).players.some((줄) => 줄.user === 나.아이디 && 줄.bot);
    await verify('일반 회원 계정으로 봇이 접속해 있다', 접속, true, { blocker: true });
  });
  await test.step('일반 회원 계정으로 「게임 시작」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 시작시도(화면, 나);
    const 창 = await 안내창읽기(game, 30_000);
    await verify('접속 안내 창이 뜬다', 창 !== null, true, { blocker: true });
    const 제목 = await verify('창 제목이 「접속 실패」다', 창?.제목 ?? '', '접속 실패');
    const 본문 = await verify(
      '창 본문이 「같은 계정으로 이미 접속 중입니다. 다른 기기의 접속을 끊고 다시 시도해 주세요」다',
      창?.본문 ?? '',
      '같은 계정으로 이미 접속 중입니다. 다른 기기의 접속을 끊고 다시 시도해 주세요',
    );
    await verify('같은 계정이 이미 접속해 있을 때 「게임 시작」을 누르면 「접속 실패」 창에 「같은 계정으로 이미 접속 중입니다. 다른 기기의 접속을 끊고 다시 시도해 주세요」가 보인다', 제목 && 본문, true);
  });
});
