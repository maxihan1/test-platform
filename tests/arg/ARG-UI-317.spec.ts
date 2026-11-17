import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-317',
  name: '가방 창에 제목 「가방」, 왼쪽 「장착 중」의 「무기」 · 「갑옷」 · 「장신구」 칸, 오른쪽 「가방」 목록, 「닫기」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('가방 창을 연다', async () => {
      const 가방 = await 가방창.열기(game);
      const 제목 = await verify('창 제목이 「가방」이다', await 가방.글(가방창.제목), '가방');
      const 장착중 = await verify('왼쪽에 「장착 중」이 보인다', await 가방.글(가방창.장착중글), '장착 중');
      const 무기 = await verify('「무기」 칸이 보인다', await 가방.장착칸이름글('무기'), '무기');
      const 갑옷 = await verify('「갑옷」 칸이 보인다', await 가방.장착칸이름글('갑옷'), '갑옷');
      const 장신구 = await verify('「장신구」 칸이 보인다', await 가방.장착칸이름글('장신구'), '장신구');
      const 목록 = await verify('오른쪽에 「가방」 목록이 보인다', await 가방.글(가방창.가방글), '가방');
      const 닫기 = await verify('「닫기」가 보인다', await 가방.닫기글(), '닫기');
      await verify('가방 창에 제목 「가방」, 왼쪽 「장착 중」의 「무기」 · 「갑옷」 · 「장신구」 칸, 오른쪽 「가방」 목록, 「닫기」가 보인다', 제목 && 장착중 && 무기 && 갑옷 && 장신구 && 목록 && 닫기, true);
      const 배치 = await game.layout(가방창.창);
      await verify('가방 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
