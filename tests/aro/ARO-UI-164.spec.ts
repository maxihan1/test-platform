import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-164',
  name: '「새 공지」를 누르면 「새 공지」 창이 열린다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 공지화면(page);

  await test.step('운영자 계정으로 로그인하고 「공지」 화면을 연다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await 화면.열기();
    await verify('「새 공지」 버튼이 보인다', await 화면.새공지버튼.isVisible(), true, { blocker: true });
  });

  await test.step('「새 공지」를 누른다', async () => {
    const 열렸다 = await 화면.새공지열기();
    await verify('「새 공지」를 누르면 「새 공지」 창이 열린다', 열렸다 && (await 화면.창.제목.innerText()).trim() === '새 공지', true);
  });

  await test.step('「새 공지」 창의 칸과 버튼을 본다', async () => {
    const 제목칸 = await verify('「제목 (1~60자)」 칸이 보인다', await 화면.제목칸.isVisible(), true);
    const 내용칸 = await verify('「내용 (1~1,000자)」 칸이 보인다', await 화면.내용칸.isVisible(), true);
    const 시작칸 = await verify('「보이기 시작 (비우면 지금)」 칸이 보인다', await 화면.시작칸.isVisible(), true);
    const 끝칸 = await verify('「보이기 끝 (비우면 끌 때까지)」 칸이 보인다', await 화면.끝칸.isVisible(), true);
    const 켜기 = await verify('켜진 「켜기」가 보인다', (await 화면.켜기체크.isVisible()) && (await 화면.켜기체크.isChecked()), true);
    const 닫기 = await verify('「닫기」 버튼이 보인다', await 화면.창.버튼('닫기').isVisible(), true);
    const 저장 = await verify('「저장」 버튼이 보인다', await 화면.창.버튼('저장').isVisible(), true);
    await verify('「새 공지」 창에 「제목 (1~60자)」 · 「내용 (1~1,000자)」 · 「보이기 시작 (비우면 지금)」 · 「보이기 끝 (비우면 끌 때까지)」 칸과 켜진 「켜기」 · 「닫기」 · 「저장」이 보인다', 제목칸 && 내용칸 && 시작칸 && 끝칸 && 켜기 && 닫기 && 저장, true);
  });
});
