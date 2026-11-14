import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-113',
  name: '작성 상자에 「이미지, 영상, 오디오 파일 추가」 · 「설문 추가」 · 「열람 주의 문구 추가」 · 「에모지 추가」 버튼이 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    const 첨부 = await verify('「이미지, 영상, 오디오 파일 추가」 버튼이 보인다', await 홈.작성.첨부.isVisible(), true);
    const 설문 = await verify('「설문 추가」 버튼이 보인다', await 홈.작성.설문.isVisible(), true);
    const 경고 = await verify('「열람 주의 문구 추가」 버튼이 보인다', await 홈.작성.경고.isVisible(), true);
    const 에모지 = await verify('「에모지 추가」 버튼이 보인다', await 홈.작성.에모지.isVisible(), true);
    await verify(
      '작성 상자에 「이미지, 영상, 오디오 파일 추가」 · 「설문 추가」 · 「열람 주의 문구 추가」 · 「에모지 추가」 버튼이 보인다',
      첨부 && 설문 && 경고 && 에모지,
      true,
    );
  });
});
