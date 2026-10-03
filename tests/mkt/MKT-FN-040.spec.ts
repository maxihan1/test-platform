import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-040',
  name: '약관 옆 「보기」를 누르면 약관 전문이 모달로 뜨고 네 가지 방법으로 닫힌다',
  precondition: ['비회원이다', '회원가입 화면이 열려 있다', '약관 전문 모달이 열려 있다'],
  params: z.object({}),
  expected: z.object({
    title: z.string().describe('약관 모달 제목').default('이용약관'),
    open: z.boolean().describe('모달이 열려 있는지').default(true),
    closed: z.boolean().describe('모달이 열려 있는지').default(false),
  }),
});

test(spec, async ({ page, expected }) => {
  const 화면 = new 회원가입화면(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 화면.열기();
  });

  await test.step('약관 옆 「보기」를 누른다', async () => {
    await 화면.약관을연다('terms', expected.title);
    await verify('약관 옆 「보기」를 누르면 약관 전문이 모달로 뜬다', await 화면.약관모달(expected.title).isVisible(), expected.open);
  });

  await test.step('모달에서 「확인」을 누른다', async () => {
    await 화면.약관확인버튼(expected.title).click();
    await 화면.약관모달(expected.title).waitFor({ state: 'hidden' });
    await verify('약관 모달은 「확인」 버튼으로 닫힌다', await 화면.약관모달(expected.title).isVisible(), expected.closed);
  });

  await test.step('모달 오른쪽 위 X 를 누른다', async () => {
    await 화면.약관을연다('terms', expected.title);
    await 화면.약관닫기X(expected.title).click();
    await 화면.약관모달(expected.title).waitFor({ state: 'hidden' });
    await verify('약관 모달은 오른쪽 위 X 로 닫힌다', await 화면.약관모달(expected.title).isVisible(), expected.closed);
  });

  await test.step('모달 바깥 영역을 누른다', async () => {
    await 화면.약관을연다('terms', expected.title);
    await 화면.모달바깥.click({ position: { x: 5, y: 5 } });
    await 화면.약관모달(expected.title).waitFor({ state: 'hidden' });
    await verify('약관 모달은 바깥 영역을 누르면 닫힌다', await 화면.약관모달(expected.title).isVisible(), expected.closed);
  });

  await test.step('ESC 키를 친다', async () => {
    await 화면.약관을연다('terms', expected.title);
    await page.keyboard.press('Escape');
    await 화면.약관모달(expected.title).waitFor({ state: 'hidden' });
    await verify('약관 모달은 ESC 키로 닫힌다', await 화면.약관모달(expected.title).isVisible(), expected.closed);
  });
});
