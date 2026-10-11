import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 고객센터화면 } from './pages/support.page.js';
import { 문의화면 } from './pages/inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-288',
  name: '고객센터 화면에 FAQ 분류 탭 「회원」 · 「주문/결제」 · 「배송」 · 「반품/교환」 과 질문 목록이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 고객센터 = new 고객센터화면(page);
  const 문의 = new 문의화면(page);
  const 머리 = new 머리글(page);

  await test.step('고객센터 화면을 연다', async () => {
    await 방해막기(page);
    await 고객센터.열기();
    await 고객센터.상담.상담버튼.waitFor();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await verify(
      '고객센터 화면에 FAQ 분류 탭 「회원」 · 「주문/결제」 · 「배송」 · 「반품/교환」 과 질문 목록이 보인다',
      { 탭: await 고객센터.탭들.allInnerTexts(), 질문목록: (await 고객센터.질문들.count()) > 0 },
      { 탭: ['회원', '주문/결제', '배송', '반품/교환'], 질문목록: true },
    );
    await verify(
      '고객센터 화면 아래쪽 「오시는 길」 에 지도 틀이 보인다',
      { 제목: await 고객센터.지도제목.isVisible(), 지도틀: await 고객센터.지도틀.isVisible(), 탭아래: await 고객센터.아래에있는가(고객센터.탭목록, 고객센터.지도틀) },
      { 제목: true, 지도틀: true, 탭아래: true },
    );
    await verify('상담 버튼과 상담 창은 Shadow DOM 안에 있다', await 고객센터.상담이그림자안에있는가(), true);
  });

  await test.step('회원으로 로그인한다', async () => {
    await 화면로그인(page, params.loginId ?? '', params.password ?? '');
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
  });

  await test.step('회원으로 1:1 문의 화면을 연다', async () => {
    await 문의.열기();
    await verify('1:1 문의 화면 제목이 보인다', await 문의.제목.isVisible(), true, { blocker: true });
    await verify('1:1 문의 화면에 「답변 알림 이메일 받기」 체크박스가 보인다', await 문의.이메일알림.isVisible(), true);
  });
});
