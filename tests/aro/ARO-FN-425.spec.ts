import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유글, 고유접두, 내것지급치우기, 로그인돼있는가, 번호들로지급보내기 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 글자, 캐릭터번호 } from './helpers/ops-api.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-425',
  name: '우편 제목을 비우고 보내면 토스트 「우편 제목을 1~50자로 입력하세요」가 뜬다',
  techniques: ['경계값 분석'],
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    짧은제목길이: z.number().int().min(1).max(50).describe('우편 제목 글자 수 — 1~50').default(1),
    긴제목길이: z.number().int().min(1).max(50).describe('우편 제목 글자 수 — 1~50').default(50),
    넘는제목길이: z.number().int().min(51).max(200).describe('API 로 보낼 우편 제목 글자 수 — 51~200').default(51),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 지급화면(page);
  const 접두 = 고유접두('ARO-FN-425');
  const 글 = 고유글('ARO-FN-425');

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
      await 내것지급치우기(page, 접두);
    });

    await test.step('「지급 · 회수」 화면을 연다', async () => {
      await 화면.열기();
      await verify('「우편으로 보내기」 폼이 보인다', await 화면.폼제목.isVisible(), true, { blocker: true });
    });

    await test.step('우편 제목을 비우고 지급을 보낸다', async () => {
      await 화면.채워서보내기({ 캐릭터: 'qa_player2', 아이템: [{ 이름: '체력 물약', 수량: 1 }], 제목: '', 사유: 글 });
      const 떴다 = await 화면.알림.뜰때까지('우편 제목을 1~50자로 입력하세요');
      await verify('우편 제목을 비우고 보내면 토스트 「우편 제목을 1~50자로 입력하세요」가 뜬다', 떴다, true);
    });

    await test.step('우편 제목 1자로 지급을 보낸다', async () => {
      await 화면.열기();
      await 화면.채워서보내기({ 캐릭터: 'qa_player2', 아이템: [{ 이름: '체력 물약', 수량: 1 }], 제목: 글자(params.짧은제목길이), 사유: 글 });
      const 떴다 = await 화면.알림.뜰때까지(/^지급 #\d+ 우편을 1명에게 보냈습니다$/);
      await verify('우편 제목 1자로 보낸 지급은 성공한다', 떴다, true);
    });

    await test.step('우편 제목 50자로 지급을 보낸다', async () => {
      await 화면.열기();
      await 화면.채워서보내기({ 캐릭터: 'qa_player2', 아이템: [{ 이름: '체력 물약', 수량: 1 }], 제목: 글자(params.긴제목길이), 사유: 글 });
      const 떴다 = await 화면.알림.뜰때까지(/^지급 #\d+ 우편을 1명에게 보냈습니다$/);
      await verify('우편 제목 50자로 보낸 지급은 성공한다', 떴다, true);
    });

    await test.step('API 로 우편 제목 51자인 지급을 보낸다', async () => {
      const 응답 = await 번호들로지급보내기(page, [await 캐릭터번호(page, 'qa_player2')], 글자(params.넘는제목길이), { reason: 글 });
      await verify('우편 제목 51자는 「우편 제목을 1~50자로 입력하세요」로 거절된다', String(응답.body.message), '우편 제목을 1~50자로 입력하세요');
    });
  } finally {
    await 내것지급치우기(page, 접두);
  }
});
