import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-048',
  name: '토스트는 아래에서 밀려 올라온다',
  precondition: ['게시판 목록이 열려 있다'],
  params: z.object({
    shortQuery: z.string().min(1).describe('토스트를 띄울 1자 검색어').default('가'),
  }),
  expected: z.object({
    startsBelow: z.boolean().describe('나타나기 시작할 때 제자리보다 아래에 있을지 여부').default(true),
    endOffsetY: z.number().describe('다 나타난 뒤 제자리에서 벗어난 세로 거리(px)').default(0),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('검색어에 1자만 넣고 「검색」을 누른다', async () => {
    await page.goto('/board');
    await page.getByRole('row').getByRole('link').first().waitFor();
    const 잼 = await page.evaluateHandle(() => ({
      움직임: new Promise<{ 시작: number; 끝: number }>((resolve) => {
        const 세로 = (el: Element) => {
          const 변환 = getComputedStyle(el).transform;
          return 변환 === 'none' ? 0 : new DOMMatrixReadOnly(변환).m42;
        };
        new MutationObserver((records, observer) => {
          for (const r of records) {
            if (!(r.target instanceof Element) || r.target.getAttribute('role') !== 'status') continue;
            const 토스트 = [...r.addedNodes].find((n): n is Element => n instanceof Element);
            if (!토스트) continue;
            observer.disconnect();
            const 시작 = 세로(토스트);
            void Promise.all(토스트.getAnimations().map((a) => a.finished)).then(() => resolve({ 시작, 끝: 세로(토스트) }));
            return;
          }
        }).observe(document.body, { childList: true, subtree: true });
      }),
    }));
    await page.getByLabel('검색어').fill(params.shortQuery);
    await page.getByRole('button', { name: '검색' }).click();
    const { 시작, 끝 } = await 잼.evaluate((m) => m.움직임);
    await verify(
      '토스트는 아래에서 밀려 올라온다',
      { 아래에서시작: 시작 > 0, 끝자리: 끝 },
      { 아래에서시작: expected.startsBelow, 끝자리: expected.endOffsetY },
    );
  });
});
