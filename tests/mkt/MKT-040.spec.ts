import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-040',
  name: '추천 상품이 8개 나오고 홈을 새로 고치는 동안 순서가 한 번 이상 바뀐다',
  precondition: ['비회원으로 홈에 들어와 있다'],
  params: z.object({
    reloads: z.number().int().min(1).describe('홈을 새로 고칠 횟수').default(4),
  }),
  expected: z.object({
    count: z.number().describe('추천 상품 수').default(8),
    minChanges: z.number().describe('새로 고치는 동안 순서가 바뀌어야 할 최소 횟수').default(1),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 추천 = page.getByRole('region', { name: '추천 상품' }).getByRole('link');
  const 읽기 = async (): Promise<{ 개수: number; 순서: string }> => {
    await 추천.first().waitFor();
    return { 개수: await 추천.count(), 순서: (await 추천.allInnerTexts()).join(' | ') };
  };

  await test.step('홈을 여러 번 새로 고치며 추천 상품 순서를 본다', async () => {
    await page.goto('/');
    const 처음 = await 읽기();
    const 개수들 = [처음.개수];
    let 이전 = 처음.순서;
    let 바뀜 = 0;
    for (let i = 0; i < params.reloads; i++) {
      await page.reload();
      const 지금 = await 읽기();
      개수들.push(지금.개수);
      if (지금.순서 !== 이전) 바뀜++;
      이전 = 지금.순서;
    }
    await verify(
      '추천 상품이 8개 나오고 홈을 새로 고치는 동안 순서가 한 번 이상 바뀐다',
      { 개수: 개수들.join(', '), 바뀐횟수충족: 바뀜 >= expected.minChanges },
      { 개수: 개수들.map(() => expected.count).join(', '), 바뀐횟수충족: true },
    );
  });
});
