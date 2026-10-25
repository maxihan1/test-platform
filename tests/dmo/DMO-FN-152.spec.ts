import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영틀 } from './components/ops-frame.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 글자수맞추기, 문의만들기, 정리함, 회원마당열기, type 만든문의, type 회원마당 } from './helpers/board-flow.helper.js';
import { 문의관리화면 } from './pages/inquiries.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-152',
  name: '답변을 0자로 저장하면 그 문의가 「답변 완료」로 바뀌지 않는다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['관리자 계정으로 로그인해 있고 답변 대기 문의가 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 정리 = new 정리함();
  const 화면 = new 문의관리화면(page);
  const 틀 = new 운영틀(page);
  let 마당: 회원마당;
  let 빈답변: 만든문의;
  let 한글자: 만든문의;
  let 천글자: 만든문의;
  try {
    await test.step('관리자 계정으로 로그인한다', async () => {
      await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    });

    await test.step('운영 화면에서 로그인 상태를 확인한다', async () => {
      await verify('머리줄에 「로그아웃」 버튼이 보인다', await 틀.로그아웃.isVisible(), true, { blocker: true });
    });

    await test.step('일회용 회원이 문의 셋을 남겨 둔다', async () => {
      마당 = await 회원마당열기(page, request, 정리);
      빈답변 = await 문의만들기(마당, page, 정리);
      한글자 = await 문의만들기(마당, page, 정리);
      천글자 = await 문의만들기(마당, page, 정리);
    });

    await test.step('문의 관리 화면에서 답변 대기 문의 줄을 확인한다', async () => {
      await 화면.열기();
      await verify('답변 대기 문의 줄의 상태가 「답변 대기」다', await 화면.줄상태(빈답변.title).innerText(), '답변 대기', { blocker: true });
    });

    await test.step('답변칸을 비운 채 「답변 저장」을 누른다', async () => {
      await 화면.답변창열기(빈답변.title, '답변하기');
      await 화면.답변칸.fill('');
      await 화면.답변저장누르기();
      await 화면.열기();
      await verify('답변을 0자로 저장하면 그 문의가 「답변 완료」로 바뀌지 않는다', await 화면.줄상태(빈답변.title).innerText(), '답변 대기');
    });

    await test.step('답변칸에 1자를 적고 「답변 저장」을 누른다', async () => {
      await 화면.답변창열기(한글자.title, '답변하기');
      await 화면.답변칸.fill(글자수맞추기(1));
      await 화면.답변저장누르기();
      await 화면.열기();
      await verify('답변을 1자로 저장하면 그 문의가 「답변 완료」로 바뀐다', await 화면.줄상태(한글자.title).innerText(), '답변 완료');
    });

    await test.step('답변칸에 1000자를 적고 「답변 저장」을 누른다', async () => {
      await 화면.답변창열기(천글자.title, '답변하기');
      await 화면.답변칸.fill(글자수맞추기(1000));
      await 화면.답변저장누르기();
      await 화면.열기();
      await verify('답변을 1000자로 저장하면 그 문의가 「답변 완료」로 바뀐다', await 화면.줄상태(천글자.title).innerText(), '답변 완료');
    });
  } finally {
    await 정리.비우기();
  }
});
