import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-192',
  name: '우편함을 열었다 닫으면 메뉴 버튼이 숫자 없이 「우편」으로 보인다',
  platforms: ['android'],
  precondition: ['우편함에 첨부가 남은 우편이 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    메뉴글: z.string().describe('우편 메뉴 버튼 글자').default('우편'),
    첨부없음글: z.string().describe('첨부 칸 글자').default('첨부 없음'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어가 우편함 첨부를 확인한다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    const 창 = await 우편함창.열기(game);
    await 창.목록이뜰때까지();
    const 첨부들 = await 창.첨부줄들();
    await verify('우편함 모든 줄의 첨부 칸이 「첨부 없음」이다', 첨부들.every((글) => 글 === expected.첨부없음글), true, { blocker: true });
    await 창.닫기누르기();
  });

  await test.step('우편함 창을 열었다 닫는다', async () => {
    const 창 = await 우편함창.열기(game);
    await 창.닫기누르기();
    await verify('우편함을 열었다 닫으면 메뉴 버튼이 숫자 없이 「우편」으로 보인다', await new 공통HUD(game).메뉴글('우편'), expected.메뉴글);
  });
});
