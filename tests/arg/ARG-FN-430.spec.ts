import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 조건될때까지, 우편넣기, 우편메뉴글될때까지, 우편줄기다리기 } from './helpers/economy.helper.js';
import { 받을우편제목들, 우편줄수, 첫우편제목 } from './helpers/mail.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-430',
  name: '「받기」가 끝나면 그 우편 줄이 「첨부 없음」으로 다시 그려진다',
  platforms: ['android'],
  precondition: [
    '첨부 있는 우편 3통이 있는 일반 회원이 우편함 창을 열었다',
    '첨부 있는 우편 2통이 남은 일반 회원이 우편함 창을 열었다',
    '첨부를 다 받은 우편 3통이 있는 일반 회원이 우편함 창을 열었다',
  ],
  elements: ['item:health_potion'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  let 남은제목들: string[] = [];
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 첨부 있는 우편 3통을 보낸 뒤 우편함 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      for (const 번호 of ['1', '2', '3']) await 우편넣기(admin, 아이디, `ARG-FN-430-${번호}`, [{ 이름: '체력 물약', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
      await 우편메뉴글될때까지(game, '우편 3');
      await 우편줄기다리기(game, 'ARG-FN-430-3');
    });
    await test.step('첨부 있는 우편 줄을 확인한다', async () => {
      await verify('첨부 있는 우편 줄이 셋 있다', (await 받을우편제목들(우편함창.지금(game))).length, 3, { blocker: true });
    });
    await test.step('첫 우편의 「받기」를 누른다', async () => {
      const 창 = 우편함창.지금(game);
      const 제목 = await 첫우편제목(창);
      await 창.받기(제목);
      await 조건될때까지(async () => !(await 받을우편제목들(창)).includes(제목), 10_000);
      await verify('「받기」가 끝나면 그 우편 줄이 「첨부 없음」으로 다시 그려진다', await 창.줄칸글(제목, 2), '첨부 없음');
      await 우편메뉴글될때까지(game, '우편 2', 10_000);
      await verify('메뉴가 「우편 2」로 다시 그려진다', await 창.hud.우편메뉴글(), '우편 2');
    });

    await test.step('남은 첨부 있는 우편 줄을 확인한다', async () => {
      남은제목들 = await 받을우편제목들(우편함창.지금(game));
      await verify('첨부 있는 우편 줄이 둘 남아 있다', 남은제목들.length, 2, { blocker: true });
    });
    await test.step('「모두 받기」를 누른다', async () => {
      const 창 = 우편함창.지금(game);
      await 창.모두받기누르기();
      await 조건될때까지(async () => (await 받을우편제목들(창)).length === 0, 10_000);
      const 칸들: string[] = [];
      for (const 제목 of 남은제목들) 칸들.push(await 창.줄칸글(제목, 2));
      await verify('남은 두 우편 줄이 「첨부 없음」으로 다시 그려진다', 칸들, ['첨부 없음', '첨부 없음']);
      await 우편메뉴글될때까지(game, '우편', 10_000);
      await verify('메뉴가 숫자 없이 「우편」으로 다시 그려진다', await 창.hud.우편메뉴글(), '우편');
    });

    await test.step('첨부를 다 받은 우편 줄을 확인한다', async () => {
      await verify('우편 줄이 셋 있다', await 우편줄수(우편함창.지금(game)), 3, { blocker: true });
    });
    await test.step('첫 우편의 「삭제」를 누른다', async () => {
      const 창 = 우편함창.지금(game);
      const 제목 = await 첫우편제목(창);
      await 창.삭제(제목);
      await 조건될때까지(async () => (await 우편줄수(창)) === 2, 10_000);
      const 빠짐 = await verify('그 우편 줄이 목록에서 빠진다', (await 창.목록.이름줄(제목)) === null, true);
      const 두줄 = await verify('우편 줄이 두 줄 남는다', await 우편줄수(창), 2);
      await verify('지운 우편 줄이 목록에서 빠져 두 줄이 남는다', 빠짐 && 두줄, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
