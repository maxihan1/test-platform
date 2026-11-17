import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇시켜서친구지우기, 봇이친구신청해수락하기, 점색 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇켜기, 접속자 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-217',
  name: '친구 목록에 접속 중인 친구가 위에 초록 점과 「Lv.1 · 접속 중」으로, 그 아래 접속하지 않은 친구가 회색 점과 「· 오프라인」으로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 접속 중인 두 번째 플레이어와 접속하지 않은 새 계정과 친구다'],
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
    await test.step('일반 회원과 두 번째 플레이어 · 새 계정이 친구인 상태에서 새 계정 봇을 끈다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 봇켜기(admin, { user: 새, pass: 새비밀번호 });
      await 봇이친구신청해수락하기(game, admin, 둘째, 아이디);
      await 봇이친구신청해수락하기(game, admin, 새, 아이디);
      await 봇끄기(admin, 새);
    });
    await test.step('두 번째 플레이어 봇이 접속했는지 확인한다', async () => {
      await verify('두 번째 플레이어 봇이 접속해 있다', (await 접속자(admin)).players.some((p) => p.user === 둘째), true, { blocker: true });
    });
    await test.step('친구 · 파티 창을 연다', async () => {
      const 창 = await 친구파티창.다시열기(game);
      await verify('친구 · 파티 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', await 창.배치문제들(), []);
      const 글들 = await 창.줄글들();
      const 원문들 = await 창.줄원문들();
      const 접속줄 = 글들.findIndex((줄) => 줄.includes(둘째));
      const 끊긴줄 = 글들.findIndex((줄) => 줄.includes(새));
      const 접속글 = await verify('접속 중인 친구가 「Lv.1 · 접속 중」으로 보인다', 글들[접속줄]?.includes('Lv.1 · 접속 중') ?? false, true);
      const 끊긴글 = await verify('접속하지 않은 친구가 「· 오프라인」으로 보인다', 글들[끊긴줄]?.includes('· 오프라인') ?? false, true);
      const 순서 = await verify('접속 중인 친구가 접속하지 않은 친구보다 위에 있다', 접속줄 >= 0 && 접속줄 < 끊긴줄, true);
      const 초록 = await verify('접속 중인 친구 앞의 점이 초록이다', 점색(원문들[접속줄] ?? ''), '초록');
      const 회색 = await verify('접속하지 않은 친구 앞의 점이 회색이다', 점색(원문들[끊긴줄] ?? ''), '회색');
      await verify('친구 목록에 접속 중인 친구가 위에 초록 점과 「Lv.1 · 접속 중」으로, 그 아래 접속하지 않은 친구가 회색 점과 「· 오프라인」으로 보인다', 접속글 && 끊긴글 && 순서 && 초록 && 회색, true);
    });
  } finally {
    await 봇시켜서친구지우기(admin, 새, 새비밀번호, 아이디);
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
