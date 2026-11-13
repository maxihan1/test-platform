import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-544',
  name: '우편을 모두 삭제하면 「받은 우편이 없습니다」가 보인다',
  platforms: ['android'],
  precondition: ['우편함의 우편이 모두 첨부가 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    첨부없음글: z.string().describe('첨부 칸 글자').default('첨부 없음'),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ game, params, expected }) => {
  let 창: 우편함창;

  await test.step('일반 회원으로 로비에 들어가 우편함 첨부를 확인한다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    창 = await 우편함창.열기(game);
    await 창.목록이뜰때까지();
    const 첨부들 = await 창.첨부줄들();
    await verify('우편함 모든 줄의 첨부 칸이 「첨부 없음」이다', 첨부들.every((글) => 글 === expected.첨부없음글), true, { blocker: true });
  });

  await test.step('우편함 창에서 모든 우편의 「삭제」를 누른다', async () => {
    await 창.모두삭제하기();
    await verify('우편을 모두 삭제하면 「받은 우편이 없습니다」가 보인다', await 창.빈안내뜨는지(), true);
  });
});
