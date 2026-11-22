import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 골드를맞추고길드창열기, 만든이름, 봇줄기다리기, 소셜정리, 알림글 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇시키기, 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-369',
  name: '길드 이름이 1자면 「길드 이름은 2~12자로 지어 주세요」가 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원이 길드 없이 골드 5,000 을 가지고 로비에 있다', '두 번째 플레이어 봇이 길드 없이 골드 5,000 을 가지고 접속해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 내아이디 = params.userId ?? '';
  const 내비밀번호 = params.userPassword ?? '';
  const 둘아이디 = params.p2Id ?? '';
  const 둘비밀번호 = params.p2Password ?? '';
  await test.cleanup('봇을 끄고 계정을 기준 상태로 되돌리기', () => 소셜정리(admin, [{ 아이디: 내아이디, 비밀번호: 내비밀번호 }, { 아이디: 둘아이디, 비밀번호: 둘비밀번호 }]));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 내아이디, 내비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('두 번째 플레이어 봇이 접속한 것을 확인한다', async () => {
    await 봇켜기(admin, 둘아이디, 둘비밀번호);
    const 접속봇 = (await 접속상태(admin)).bots;
    await verify('두 번째 플레이어 봇이 접속해 있다', 접속봇.includes(둘아이디), true, { blocker: true });
  });

  await test.step('길드 창을 열고 골드가 5,000 인 것을 확인한다', async () => {
    const 창 = await 골드를맞추고길드창열기(game, 5000);
    await verify('골드가 5,000 이다', await new 공통HUD(game).골드(), 5000, { blocker: true });
    await verify('길드가 없다', (await 창.안내글읽기()).includes('아직 길드가 없습니다'), true, { blocker: true });
  });

  await test.step('공백을 뺀 1자 이름으로 「만들기 · 500G」를 누른다', async () => {
    const 창 = await 길드창.열기(game);
    await 창.만들기(만든이름(1));
    await verify('길드 이름이 1자면 「길드 이름은 2~12자로 지어 주세요」가 뜬다', (await 알림글(game, '길드 이름은 2~12자로 지어 주세요')) !== null, true);
  });

  await test.step('앞뒤에 공백을 붙인 2자 이름으로 「만들기 · 500G」를 누른다', async () => {
    const 창 = await 길드창.열기(game);
    await 창.만들기(' ' + 만든이름(2) + ' ');
    await verify('앞뒤 공백을 자른 길드 이름이 2자일 때 길드가 생긴다', (await 창.길드머리기다리기('길드원 1명')) !== null, true);
    await 창.탈퇴();
  });

  await test.step('12자 이름으로 「만들기 · 500G」를 누른다', async () => {
    const 창 = await 길드창.열기(game);
    await 창.만들기(만든이름(12));
    await verify('길드 이름이 12자일 때 길드가 생긴다', (await 창.길드머리기다리기('길드원 1명')) !== null, true);
    await 창.탈퇴();
  });

  await test.step('봇에게 13자 이름으로 길드 만들기를 보내게 하고 봇 기록을 읽는다', async () => {
    await 봇시키기(admin, 둘아이디, 'gm:gold 5000');
    await 봇줄기다리기(admin, 둘아이디, 'toast', '[GM] gold 5000');
    await 봇시키기(admin, 둘아이디, 'guild_create:' + 만든이름(13));
    await verify('길드 이름이 13자일 때 「길드 이름은 2~12자로 지어 주세요」가 뜬다', await 봇줄기다리기(admin, 둘아이디, 'toast', '길드 이름은 2~12자로 지어 주세요'), true);
  });
});
