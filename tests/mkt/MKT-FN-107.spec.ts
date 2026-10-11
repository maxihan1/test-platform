import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 주문상세화면 } from './pages/my-order.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-107',
  name: '없는 주문 번호로 주문 상세를 열면 깨지지 않고 안내가 보인다',
  platforms: ['desktop'],
  precondition: [
    '회원으로 로그인해 있다',
  ],
  techniques: ['오류 추정'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 주문상세화면(page);
  const 머리 = new 머리글(page);

  await 방해막기(page);

  await test.step('회원으로 로그인한다', async () => {
    await 화면로그인(page, params.loginId ?? '', params.password ?? '');
    await 머리.로그아웃버튼.waitFor();
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
  });

  await test.step('없는 주문 번호로 주문 상세 화면을 연다', async () => {
    await 상세.열기('DM99999999-9999');
    await 상세.없는주문안내.waitFor();
    await verify(
      '없는 주문 번호로 주문 상세를 열면 깨지지 않고 안내가 보인다',
      { 제목보임: await 상세.제목.isVisible(), 안내: await 상세.없는주문안내.innerText() },
      { 제목보임: true, 안내: '주문을 찾을 수 없습니다' },
    );
  });
});
