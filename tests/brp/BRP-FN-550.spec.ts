import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 금색인가, 기호앞색, 길드맞이하기, 길드세우기, 길드창다시열기, 소셜정리 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-550',
  name: '길드원 줄을 읽으면 길드장 줄에 금색 「[길드장]」과 이름 · 「Lv.」이 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원이 길드장인 길드가 있고 두 번째 플레이어 봇이 길드원이다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    길드이름: z.string().min(2).max(12).describe('만들 길드 이름 — 앞뒤 공백 없는 2~12자').default('QA길드'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 내아이디 = params.userId ?? '';
  const 내비밀번호 = params.userPassword ?? '';
  const 둘아이디 = params.p2Id ?? '';
  const 둘비밀번호 = params.p2Password ?? '';
  const 길드이름 = params.길드이름;
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

  await test.step('일반 회원이 길드장인 길드가 있는 것을 확인한다', async () => {
    const 창 = await 길드세우기(game, 길드이름);
    await verify('일반 회원이 길드장인 길드가 있다', 창 !== null, true, { blocker: true });
    await 창?.닫기();
  });

  await test.step('두 번째 플레이어가 길드원이 된 것을 확인한다', async () => {
    const 창 = await 길드창.열기(game);
    await verify('두 번째 플레이어가 길드에 들어와 있다', await 길드맞이하기(admin, 창, 둘아이디, 내아이디, 2), true, { blocker: true });
    await 창.닫기();
  });

  await test.step('길드원 줄을 읽는다', async () => {
    const 창 = await 길드창다시열기(game);
    const 줄들 = await 창.길드원줄들();
    const 내줄 = 줄들[창.길드원줄번호(줄들, 내아이디)] ?? '';
    const 길드장글자 = await verify('길드장 줄에 「[길드장]」이 보인다', 색글떼기(내줄).includes('[길드장]'), true);
    const 길드장색 = await verify('「[길드장]」이 금색이다', 금색인가(기호앞색(내줄, '[길드장]')), true);
    const 이름보임 = await verify('길드장 줄에 이름이 보인다', 색글떼기(내줄).includes(내아이디), true);
    const 레벨보임 = await verify('길드장 줄에 「Lv.」가 보인다', 색글떼기(내줄).includes('Lv.'), true);
    await verify('길드원 줄을 읽으면 길드장 줄에 금색 「[길드장]」과 이름 · 「Lv.」이 보인다', 길드장글자 && 길드장색 && 이름보임 && 레벨보임, true);
  });

  await test.step('길드원 줄 앞의 접속 점을 읽는다', async () => {
    const 창 = await 길드창.열기(game);
    const 줄들 = await 창.길드원줄들();
    const 둘줄 = 줄들[창.길드원줄번호(줄들, 둘아이디)] ?? '';
    await verify('길드원 줄 앞에 접속 점이 보인다', 둘줄.includes('●'), true);
  });
});
