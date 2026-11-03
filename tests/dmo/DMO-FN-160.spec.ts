import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영틀 } from './components/ops-frame.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 문의만들기, 정리함, 회원마당열기, type 만든문의 } from './helpers/board-flow.helper.js';
import { 문의관리화면 } from './pages/inquiries.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-160',
  name: '왼쪽 메뉴 「문의」 옆 건수가 「답변 대기」 문의 수와 같다',
  platforms: ['desktop', 'mobile'],
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
  let 문의: 만든문의;
  try {
    await test.step('관리자 계정으로 로그인한다', async () => {
      await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    });

    await test.step('운영 화면에서 로그인 상태를 확인한다', async () => {
      await verify('머리줄에 「로그아웃」 버튼이 보인다', await 틀.로그아웃.isVisible(), true, { blocker: true });
    });

    await test.step('일회용 회원이 문의를 남겨 둔다', async () => {
      const 마당 = await 회원마당열기(page, request, 정리);
      문의 = await 문의만들기(마당, page, 정리);
    });

    await test.step('문의 관리 화면에서 답변 대기 문의 줄을 확인한다', async () => {
      await 화면.열기();
      await verify('답변 대기 문의 줄의 상태가 「답변 대기」다', await 화면.줄상태(문의.title).innerText(), '답변 대기', { blocker: true });
    });

    await test.step('왼쪽 메뉴 「문의」 옆 건수를 읽는다', async () => {
      let 메뉴건수 = -1;
      let 대기건수 = -2;
      for (let 시도 = 0; 시도 < 3 && 메뉴건수 !== 대기건수; 시도 += 1) {
        await 화면.열기();
        await 틀.답변대기건수.waitFor();
        메뉴건수 = Number(await 틀.답변대기건수.innerText());
        await 화면.상태고르기하기('답변 대기');
        대기건수 = await 화면.총건수읽기();
      }
      await verify('왼쪽 메뉴 「문의」 옆 건수가 「답변 대기」 문의 수와 같다', 메뉴건수, 대기건수);
    });
  } finally {
    await 정리.비우기();
  }
});
