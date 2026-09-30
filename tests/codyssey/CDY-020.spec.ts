import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-020',
  name: 'FAQ 화면의 분류 목록이 「AI 올인원」 탭에서는 여덟 가지이고 「AI 네이티브」 탭을 누르면 여섯 가지로 바뀐다',
  precondition: ['비회원이다'],
  params: null,
  expected: z.object({
    allInOneCategories: z.string().describe('「AI 올인원」 탭의 분류를 " | " 로 이은 것').default('전체 | 모집 및 지원 | 교육생 입학연수과정 | AI·SW 기초 | Term Project 및 동료학습 | 교육 일정 및 방식 | 커리어 및 수료 혜택 | 비용 및 지원 제도'),
    nativeCategories: z.string().describe('「AI 네이티브」 탭의 분류를 " | " 로 이은 것').default('전체 | 교육과정 소개 | 교육 혜택 | 교육 신청 절차 | 교육 수료 | 기타'),
  }),
});

test(spec, async ({ page, expected }) => {
  const 분류 = page.getByRole('combobox').first();
  const 옵션들 = async () => (await 분류.getByRole('option').allInnerTexts()).map((t) => t.trim()).join(' | ');

  await test.step('FAQ 화면을 연다', async () => {
    await page.goto('/board/faqGoList');
    await 분류.getByRole('option', { name: '비용 및 지원 제도', exact: true }).waitFor({ state: 'attached' });
    await verify('FAQ 화면의 「AI 올인원」 탭 분류가 전체·모집 및 지원 등 여덟 가지다', await 옵션들(), expected.allInOneCategories);
  });

  await test.step('「AI 네이티브」 탭을 누른다', async () => {
    await page.getByRole('button', { name: 'AI 네이티브', exact: true }).click();
    await 분류.getByRole('option', { name: '교육 수료', exact: true }).waitFor({ state: 'attached' });
    await verify('「AI 네이티브」 탭을 누르면 분류가 전체·교육과정 소개·교육 혜택·교육 신청 절차·교육 수료·기타 여섯 가지로 바뀐다', await 옵션들(), expected.nativeCategories);
  });
});
