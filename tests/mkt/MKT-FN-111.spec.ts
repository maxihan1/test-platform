import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 게시글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-111',
  name: '글쓰기 화면의 제목 · 본문 · 분류가 규칙에 맞지 않으면 등록할 때 토스트 안내가 보인다',
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('로그인 아이디').default('user2'),
    password: z.string().min(1).describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  unconfirmed:
    '기획서와 다름 — 차이 D12·D13·D14: 기획서에 없는 입력 안내가 화면에 있다. 제목 · 본문 · 분류가 규칙에 맞지 않으면 등록할 때 토스트 안내가 나온다 (작성 요청 5873)',
});

test(spec, async ({ page, params }) => {
  const 쓰기 = new 게시글쓰기화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);
  const 본문 = '글쓰기 입력 안내를 보려는 본문입니다';
  await page.request.post('/api/auth/login', { data: { loginId: params.loginId, password: params.password ?? '' } });

  await test.step('글쓰기 화면에서 제목을 1자로 적고 등록한다', async () => {
    await 쓰기.열기();
    await 쓰기.준비된폼().waitFor();
    await verify('회원으로 로그인해 있다', await 머리.로그아웃버튼().isVisible(), true, { blocker: true });
    await 쓰기.글채우기('자유', '가', 본문);
    await 쓰기.등록버튼().click();
    await 알림.문구('제목은 2~50자입니다').waitFor();
    await verify('제목을 1자로 적고 등록하면 토스트 「제목은 2~50자입니다」가 보인다', await 알림.문구('제목은 2~50자입니다').isVisible(), true);
  });

  await test.step('글쓰기 화면에서 본문을 9자로 적고 등록한다', async () => {
    await 쓰기.글채우기('자유', '입력 안내 시험', '가나다라마바사아자');
    await 쓰기.등록버튼().click();
    await 알림.문구('본문은 10~2000자입니다').waitFor();
    await verify('본문을 9자로 적고 등록하면 토스트 「본문은 10~2000자입니다」가 보인다', await 알림.문구('본문은 10~2000자입니다').isVisible(), true);
  });

  await test.step('글쓰기 화면에서 분류를 고르지 않고 등록한다', async () => {
    await 쓰기.글채우기('분류를 선택하세요', '입력 안내 시험', 본문);
    await 쓰기.등록버튼().click();
    await 알림.문구('분류를 선택하세요').waitFor();
    await verify('분류를 고르지 않고 등록하면 토스트 「분류를 선택하세요」가 보인다', await 알림.문구('분류를 선택하세요').isVisible(), true);
  });
});
