import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면준비, 손님봇채우기, 시작시도, 안내창읽기 } from './helpers/login-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 접속끊기, 접속자 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-025',
  name: '서버 인원이 7명일 때 「게임 시작」을 누르면 8번째로 접속돼 로비가 보인다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
  precondition: ['손님 봇 7개가 접속해 있다', '손님 봇 8개가 접속해 있다'],
  elements: ['zone:CharSelect'],
  params: z.object({
    손님봇안: z.number().int().min(1).describe('먼저 켜 둘 손님 봇 수 — 서버 최대 인원 8 보다 1 적은 값').default(7),
    손님봇밖: z.number().int().min(1).describe('서버를 가득 채울 손님 봇 수 — 서버 최대 인원과 같은 값').default(8),
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
  await test.step('손님 봇 7개를 켠다', async () => {
    await 손님봇채우기(admin, params.손님봇안);
    await verify('서버 접속자가 7명이다', (await 접속자(admin)).players.length, params.손님봇안, { blocker: true });
  });
  await test.step('일반 회원 계정으로 「게임 시작」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 시작시도(화면, 나);
    const 로비 = await verify(
      '로비 화면이 보인다',
      await 로비화면.열기(game).then(
        () => true,
        () => false,
      ),
      true,
    );
    const 여덟째 = await verify('8번째로 접속해 서버 접속자가 8명이다', (await 접속자(admin)).players.length, params.손님봇밖);
    await verify('서버 인원이 7명일 때 「게임 시작」을 누르면 8번째로 접속돼 로비가 보인다', 로비 && 여덟째, true);
  });
  await test.step('일반 회원의 접속을 끊고 손님 봇을 8개로 채운다', async () => {
    await 접속끊기(admin, 나.아이디);
    await 로그인화면준비(game, driver);
    await 손님봇채우기(admin, params.손님봇밖);
    await verify('서버 접속자가 8명이다', (await 접속자(admin)).players.length, params.손님봇밖, { blocker: true });
  });
  await test.step('손님 봇 8개가 접속한 채 일반 회원 계정으로 「게임 시작」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 시작시도(화면, 나);
    const 창 = await 안내창읽기(game, 30_000);
    await verify('접속 안내 창이 뜬다', 창 !== null, true, { blocker: true });
    const 제목 = await verify('창 제목이 「접속 실패」다', 창?.제목 ?? '', '접속 실패');
    const 본문 = await verify('창 본문이 「서버 인원이 가득 찼습니다. 잠시 뒤 다시 시도해 주세요」다', 창?.본문 ?? '', '서버 인원이 가득 찼습니다. 잠시 뒤 다시 시도해 주세요');
    await verify('「접속 실패」 창에 「서버 인원이 가득 찼습니다. 잠시 뒤 다시 시도해 주세요」가 보인다', 제목 && 본문, true);
  });
});
