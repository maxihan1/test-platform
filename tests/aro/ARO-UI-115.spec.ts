import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 로그인돼있는가 } from './helpers/grant.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-115',
  name: '「우편으로 보내기」 폼에 「받는 캐릭터 (1~50명)」 · 아이템 한 줄 · 「아이템 줄 더하기」 · 「골드」 · 「우편 제목 (1~50자)」 · 「지급 사유 (1~200자, 기록에만 남음)」 · 「우편 본문 (500자까지)」 · 「보내기」가 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 지급화면(page);

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
  });

  await test.step('「지급 · 회수」 화면을 연다', async () => {
    await 화면.열기();
    const 폼 = await verify('「우편으로 보내기」 폼이 보인다', await 화면.폼제목.isVisible(), true, { blocker: true });
    const 받는 = await verify('「받는 캐릭터 (1~50명)」 칸이 보인다', await 화면.받는칸.isVisible(), true);
    const 아이템 = await verify('아이템 한 줄이 보인다', await 화면.아이템이름칸들.count(), 1);
    const 더하기 = await verify('「아이템 줄 더하기」 버튼이 보인다', await 화면.줄더하기.isVisible(), true);
    const 골드 = await verify('「골드」 칸이 보인다', await 화면.골드칸.isVisible(), true);
    const 제목 = await verify('「우편 제목 (1~50자)」 칸이 보인다', await 화면.제목칸.isVisible(), true);
    const 사유 = await verify('「지급 사유 (1~200자, 기록에만 남음)」 칸이 보인다', await 화면.사유칸.isVisible(), true);
    const 본문 = await verify('「우편 본문 (500자까지)」 칸이 보인다', await 화면.본문칸.isVisible(), true);
    const 보내기 = await verify('「보내기」 버튼이 보인다', await 화면.보내기버튼.isVisible(), true);
    await verify(
      '「우편으로 보내기」 폼에 「받는 캐릭터 (1~50명)」 · 아이템 한 줄 · 「아이템 줄 더하기」 · 「골드」 · 「우편 제목 (1~50자)」 · 「지급 사유 (1~200자, 기록에만 남음)」 · 「우편 본문 (500자까지)」 · 「보내기」가 보인다',
      폼 && 받는 && 아이템 && 더하기 && 골드 && 제목 && 사유 && 본문 && 보내기,
      true,
    );
  });

  await test.step('폼 아래 안내를 본다', async () => {
    await verify('폼에 안내 「보낸 우편은 받는 사람이 게임 우편함에서 첨부를 받습니다. 안 받은 첨부만 회수할 수 있습니다.」가 보인다', await 화면.안내.isVisible(), true);
  });
});
