import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 오류응답걸기 } from './helpers/mock.helper.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-105',
  name: '주문 목록 응답이 500 이면 주문 내역 화면이 깨지지 않고 오류 안내가 보인다',
  platforms: ['desktop'],
  precondition: [
    '주문 목록 응답은 500 가짜 응답(모킹)이다',
  ],
  techniques: ['오류 추정'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 주문내역화면(page);
  const 알림 = new 토스트(page);
  const 머리 = new 머리글(page);
  let 해제: (() => Promise<void>) | undefined;

  try {
    await 방해막기(page);

    await test.step('회원으로 로그인한다', async () => {
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await 머리.로그아웃버튼.waitFor();
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    });

    await test.step('주문 목록 응답을 500 으로 주고 주문 내역 화면을 연다', async () => {
      해제 = await 오류응답걸기(page.context(), /\/api\/orders\?period=/, 500, { code: 'INTERNAL' });
      await 목록.응답기다리지않고열기();
      await 알림.모두.first().waitFor();
      await verify(
        '주문 목록 응답이 500 이면 주문 내역 화면이 깨지지 않고 오류 안내가 보인다',
        { 제목보임: await 목록.제목.isVisible(), 오류안내: await 알림.모두.first().innerText() },
        { 제목보임: true, 오류안내: '잠시 후 다시 시도해 주세요' },
      );
    });
  } finally {
    await 해제?.();
  }
});
