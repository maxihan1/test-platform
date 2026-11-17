import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드맞추기, 내가길드만들기, 내가봇을길드에초대해수락시키기, 봇시켜서길드나가기 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇켜기, 접속자 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-332',
  name: '길드원 줄이 금색 「[길드장]」인 내가 맨 위, 그다음 접속 중인 사람 차례로 「Lv.<레벨>」과 함께 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 길드장인 길드에 접속하지 않은 새 계정과 접속 중인 두 번째 플레이어 봇이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    secondPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    newId: z.string().describe('새 계정 아이디').optional().meta({ secret: true, account: '새 계정' }),
    newPassword: z.string().describe('새 계정 비밀번호').optional().meta({ secret: true, account: '새 계정' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 둘째 = params.secondId ?? '';
  const 둘째비밀번호 = params.secondPassword ?? '';
  const 새 = params.newId ?? '';
  const 새비밀번호 = params.newPassword ?? '';
  try {
    await test.step('일반 회원이 길드를 만들고 두 번째 플레이어와 새 계정 봇을 길드원으로 들인 뒤 새 계정 봇을 끈다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 봇켜기(admin, { user: 새, pass: 새비밀번호 });
      await 골드맞추기(game, 1000);
      await 내가길드만들기(game, '시험길드332');
      await 내가봇을길드에초대해수락시키기(game, admin, 둘째);
      await 내가봇을길드에초대해수락시키기(game, admin, 새);
      await 봇끄기(admin, 새);
    });
    await test.step('두 번째 플레이어 봇이 접속했는지 확인한다', async () => {
      await verify('두 번째 플레이어 봇이 접속해 있다', (await 접속자(admin)).players.some((p) => p.user === 둘째), true, { blocker: true });
    });
    await test.step('길드 창을 연다', async () => {
      const 창 = await 길드창.다시열기(game);
      const 글들 = await 창.줄글들();
      const 원문들 = await 창.줄원문들();
      const 첫줄 = await verify('맨 위 줄이 「[길드장]」인 일반 회원이다', 글들[0]?.includes('[길드장]') === true && 글들[0].includes(아이디), true);
      const 금색 = await verify('「[길드장]」이 금색이다', (원문들[0] ?? '').toUpperCase().includes('#FFD152'), true);
      const 둘째줄 = await verify('그다음 줄이 접속 중인 두 번째 플레이어다', 글들[1]?.includes(둘째) ?? false, true);
      const 레벨 = await verify('길드원 줄마다 「Lv.」가 보인다', 글들.slice(0, 2).every((줄) => /Lv\.\d+/.test(줄)), true);
      await verify('길드원 줄이 금색 「[길드장]」인 내가 맨 위, 그다음 접속 중인 사람 차례로 「Lv.<레벨>」과 함께 보인다', 첫줄 && 금색 && 둘째줄 && 레벨, true);
    });
  } finally {
    await 봇시켜서길드나가기(admin, 새, 새비밀번호);
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
