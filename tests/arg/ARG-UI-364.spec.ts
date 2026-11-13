import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-364',
  name: '첨부가 없는 우편 줄에 제목 · 「첨부 없음」 · 「삭제」가 보이고 「받기」는 보이지 않는다',
  platforms: ['android'],
  precondition: ['첨부가 없는 우편이 하나 이상 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    첨부없음글: z.string().describe('첨부 칸 글자').default('첨부 없음'),
  }),
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없어 우편을 만들 수 없다)',
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면의 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('우편함 창을 연다', async () => {
    const 창 = await 우편함창.열기(game);
    await 창.목록이뜰때까지();
    const 첨부들 = await 창.첨부줄들();
    const 번호 = 첨부들.indexOf(expected.첨부없음글);
    await verify('우편함에 첨부 없는 우편 줄이 하나 이상 보인다', 번호 >= 0, true, { blocker: true });
    const 제목 = (await 창.제목들())[번호] ?? '';
    const 제목있음 = await verify('첨부 없는 우편 줄에 제목이 보인다', 제목 !== '', true);
    const 첨부없음 = await verify('첨부 없는 우편 줄에 「첨부 없음」이 보인다', (await 창.첨부줄원문(번호)).includes(expected.첨부없음글), true);
    const 삭제 = await verify('첨부 없는 우편 줄에 「삭제」가 보인다', await 창.삭제있는지(번호), true);
    const 받기 = await verify('첨부 없는 우편 줄에 「받기」가 보이지 않는다', await 창.받기있는지(번호), false);
    await verify('첨부가 없는 우편 줄에 제목 · 「첨부 없음」 · 「삭제」가 보이고 「받기」는 보이지 않는다', 제목있음 && 첨부없음 && 삭제 && 받기, true);
  });
});
