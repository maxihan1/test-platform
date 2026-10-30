import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영틀 } from './components/ops-frame.component.js';
import { 토스트 } from './components/toast.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 문의만들기, 정리함, 회원마당열기, type 만든문의 } from './helpers/board-flow.helper.js';
import { 문의관리화면 } from './pages/inquiries.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-422',
  name: '「답변 저장」 응답이 서버 실패면 창이 깨지지 않고 오류 안내 토스트가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있고 답변 대기 문의가 있다', '「답변 저장」 응답은 가짜 응답(모킹)이다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
  techniques: ['오류 추정'],
});

test(spec, async ({ page, request, params }) => {
  const 정리 = new 정리함();
  const 화면 = new 문의관리화면(page);
  const 틀 = new 운영틀(page);
  const 알림 = new 토스트(page);
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

    await test.step('「답변 저장」 응답을 서버 실패로 바꿔 둔다', async () => {
      const 주소 = '**/api/ops/inquiries/*/answer';
      await page.context().route(주소, (경로) => 경로.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));
      정리.더하기(() => page.context().unroute(주소));
    });

    await test.step('「답변 저장」 응답이 실패하는 채로 「답변 저장」을 누른다', async () => {
      await 화면.답변창열기(문의.title, '답변하기');
      await 화면.답변칸.fill('시험으로 적는 답변입니다');
      await 화면.답변저장누르기();
      await 알림.목록.first().waitFor();
      const 화면그대로 = await verify('문의 관리 화면이 깨지지 않고 그대로 보인다', await 화면.줄(문의.title).isVisible(), true);
      const 토스트보임 = await verify('오류 안내 토스트가 보인다', await 알림.목록.first().isVisible(), true);
      await verify('「답변 저장」 응답이 서버 실패면 창이 깨지지 않고 오류 안내 토스트가 보인다', 화면그대로 && 토스트보임, true);
    });
  } finally {
    await 정리.비우기();
  }
});
