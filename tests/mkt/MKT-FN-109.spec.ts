import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 모달 } from './components/feedback.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-109',
  name: '약관 옆 「보기」를 누르면 약관 전문 모달이 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);
  const 창 = new 모달(page);

  await test.step('회원가입 화면에서 이용약관 옆 「보기」를 누른다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await verify('회원가입 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await 화면.약관보기버튼('이용약관').click();
    await 창.열림기다리기();
    await verify('약관 옆 「보기」를 누르면 약관 전문 모달이 보인다', await 창.창.isVisible(), true);
  });

  await test.step('약관 전문 모달의 「확인」 버튼을 누른다', async () => {
    await 창.버튼('확인').click();
    await 창.닫힘기다리기();
    await verify('「확인」 버튼으로 약관 모달이 닫힌다', await 창.창.isVisible(), false);
  });

  await test.step('「보기」를 다시 누르고 모달 오른쪽 위 X 를 누른다', async () => {
    await 화면.약관보기버튼('이용약관').click();
    await 창.열림기다리기();
    await 창.닫기X.click();
    await 창.닫힘기다리기();
    await verify('오른쪽 위 X 로 약관 모달이 닫힌다', await 창.창.isVisible(), false);
  });

  await test.step('「보기」를 다시 누르고 모달 바깥을 누른다', async () => {
    await 화면.약관보기버튼('이용약관').click();
    await 창.열림기다리기();
    await 창.바깥누르기();
    await 창.닫힘기다리기();
    await verify('바깥 영역을 누르면 약관 모달이 닫힌다', await 창.창.isVisible(), false);
  });

  await test.step('「보기」를 다시 누르고 ESC 를 친다', async () => {
    await 화면.약관보기버튼('이용약관').click();
    await 창.열림기다리기();
    await page.keyboard.press('Escape');
    await 창.닫힘기다리기();
    await verify('ESC 키로 약관 모달이 닫힌다', await 창.창.isVisible(), false);
  });
});
