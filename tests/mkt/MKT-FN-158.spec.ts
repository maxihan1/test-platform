import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 둘째아이디, 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 문의화면 } from './pages/inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-158',
  name: '유형을 고르지 않고 「등록」 을 누르면 토스트 「문의 유형을 선택하세요」 가 보인다',
  platforms: ['desktop'],
  precondition: ['두 번째 회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 문의 = new 문의화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);

  await test.step('두 번째 회원으로 로그인한다', async () => {
    await 방해막기(page);
    await 화면로그인(page, 둘째아이디, params.password ?? '');
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
  });

  await test.step('유형만 고르지 않고 제목과 내용을 적어 「등록」 을 누른다', async () => {
    await 문의.열기();
    await 문의.채우기({ 제목: '유형을 비운 시험 문의', 내용: '유형을 비우고 등록해 봅니다' });
    await 문의.등록하고응답기다리기();
    await 알림.모두.first().waitFor();
    await verify('유형을 고르지 않고 「등록」 을 누르면 토스트 「문의 유형을 선택하세요」 가 보인다', await 알림.모두.allInnerTexts(), ['문의 유형을 선택하세요']);
  });

  await test.step('제목만 비우고 유형과 내용을 넣어 「등록」 을 누른다', async () => {
    await 문의.열기();
    await 문의.채우기({ 유형: '주문', 내용: '제목을 비우고 등록해 봅니다' });
    await 문의.등록하고응답기다리기();
    await 알림.모두.first().waitFor();
    await verify('제목을 비우고 「등록」 을 누르면 토스트 「제목은 1~50자입니다」 가 보인다', await 알림.모두.allInnerTexts(), ['제목은 1~50자입니다']);
  });

  await test.step('내용만 비우고 유형과 제목을 넣어 「등록」 을 누른다', async () => {
    await 문의.열기();
    await 문의.채우기({ 유형: '주문', 제목: '내용을 비운 시험 문의' });
    await 문의.등록하고응답기다리기();
    await 알림.모두.first().waitFor();
    await verify('내용을 비우고 「등록」 을 누르면 토스트 「내용은 1~1000자입니다」 가 보인다', await 알림.모두.allInnerTexts(), ['내용은 1~1000자입니다']);
  });
});
