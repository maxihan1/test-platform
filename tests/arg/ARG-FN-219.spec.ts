import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 조건될때까지, 우편넣기, 우편받기, 우편제목, 우편줄기다리기 } from './helpers/economy.helper.js';
import { 줄에버튼있나 } from './helpers/mail.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-219',
  name: '첨부가 0건인 우편은 「삭제」를 한 번 누르면 확인 창 없이 목록에서 사라진다',
  platforms: ['android'],
  precondition: ['첨부를 다 받은 우편 1통이 있는 일반 회원이 우편함 창을 열었다', '첨부가 1건 남은 우편이 있는 일반 회원이 우편함 창을 열었다'],
  techniques: ['경계값 분석'],
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
  const 받은우편 = 우편제목('ARG-FN-219-A');
  const 남은우편 = 우편제목('ARG-FN-219-B');
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 첨부를 받은 우편을 만들어 우편함 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-FN-219-A', [{ 이름: '체력 물약', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
      await 우편받기(game, 'ARG-FN-219-A');
      await 우편줄기다리기(game, 'ARG-FN-219-A');
    });
    await test.step('첨부를 받은 우편 줄을 확인한다', async () => {
      await verify('우편 줄의 첨부 칸에 「첨부 없음」이 보인다', await 우편함창.지금(game).줄칸글(받은우편, 2), '첨부 없음', { blocker: true });
    });
    await test.step('그 우편의 「삭제」를 한 번 누른다', async () => {
      const 창 = 우편함창.지금(game);
      await 창.삭제(받은우편);
      const 사라졌다 = await 조건될때까지(async () => (await 창.목록.이름줄(받은우편)) === null, 10_000);
      await verify('첨부가 0건인 우편은 「삭제」를 한 번 누르면 확인 창 없이 목록에서 사라진다', 사라졌다, true);
    });

    await test.step('첨부가 1건 남은 우편을 보내 우편함 창에 오기를 기다린다', async () => {
      await 우편넣기(admin, 아이디, 'ARG-FN-219-B', [{ 이름: '체력 물약', 개수: 1 }]);
      await 우편줄기다리기(game, 'ARG-FN-219-B');
    });
    await test.step('첨부가 남은 우편 줄을 확인한다', async () => {
      await verify('우편 줄에 「받기」가 보인다', await 줄에버튼있나(우편함창.지금(game), 남은우편, '받기'), true, { blocker: true });
    });
    await test.step('그 우편의 「삭제」를 누른다', async () => {
      const 창 = 우편함창.지금(game);
      await 창.삭제(남은우편);
      await 창.hud.알림기다리기('첨부를 먼저 받아 주세요');
      await verify('첨부가 1건 남은 우편은 「삭제」를 눌러도 목록에 남는다', (await 창.목록.이름줄(남은우편)) !== null, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
