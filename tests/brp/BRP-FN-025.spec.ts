import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로되돌리기, 봇끄기, 손님봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-025',
  name: '서버 인원이 7명일 때 로그인하면 8번째로 들어가 로비 화면이 열린다',
  platforms: ['windows'],
  precondition: ['손님 봇 7개가 게임 서버에 접속해 있다', '손님 봇 8개가 게임 서버에 접속해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('손님 봇을 끄고 방을 로비로 돌리기', () => 로비로되돌리기(admin));

  const 봇들: string[] = [];
  await test.step('손님 봇 8개를 접속시킨다', async () => {
    for (let 번호 = 1; 번호 <= 8; 번호 += 1) 봇들.push(await 손님봇켜기(admin, `qaguest${String(번호)}`));
    await verify('손님 봇 8개가 게임 서버에 접속해 있다', (await 접속상태(admin)).clients, 8, { blocker: true });
  });

  await test.step('일반 회원으로 「게임 시작」을 누른다', async () => {
    const 화면 = await 로그인화면.열림(game);
    await 화면.넣고시작(아이디, 비밀번호);
    await verify('접속 실패 안내 창이 뜬다', await 화면.안내.뜰때까지(20_000), true, { blocker: true });
    const 제목 = await verify('안내 창 제목이 「접속 실패」다', await 화면.안내.제목(), '접속 실패');
    const 본문 = await verify('안내 창 본문에 「서버 인원이 가득 찼습니다. 잠시 뒤 다시 시도해 주세요」가 들어 있다', (await 화면.안내.본문()).includes('서버 인원이 가득 찼습니다. 잠시 뒤 다시 시도해 주세요'), true);
    await verify('서버 인원이 8명일 때 로그인한 뒤 「접속 실패」 창에 「서버 인원이 가득 찼습니다. 잠시 뒤 다시 시도해 주세요」가 보인다', 제목 && 본문, true);
    await 화면.안내.확인누르기();
  });

  await test.step('손님 봇 하나를 끄고 일반 회원으로 다시 「게임 시작」을 누른다', async () => {
    await 봇끄기(admin, 봇들[7] ?? '');
    const 화면 = await 로그인화면.열림(game);
    await 화면.넣고시작(아이디, 비밀번호);
    await verify('서버 인원이 7명일 때 로그인하면 8번째로 들어가 로비 화면이 열린다', await 화면.로비뜰때까지(30_000), true);
  });
});
