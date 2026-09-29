import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-033',
  name: '처리 결과 토스트는 3초간 보이고 사라진다',
  precondition: ['게시판 목록이 열려 있다'],
  params: z.object({
    shortQuery: z.string().min(1).describe('토스트를 띄울 1자 검색어').default('가'),
    toleranceSeconds: z.number().nonnegative().describe('허용 오차(초)').default(0.2),
  }),
  expected: z.object({
    seconds: z.number().describe('토스트가 보이는 시간(초)').default(3),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('검색어에 1자만 넣고 「검색」을 누른다', async () => {
    await page.goto('/board');
    await page.getByRole('row').getByRole('link').first().waitFor();
    const 잼 = await page.evaluateHandle(() => ({
      머문시간: new Promise<number>((resolve) => {
        let 뜬때 = -1;
        new MutationObserver((records, observer) => {
          for (const r of records) {
            if (!(r.target instanceof Element) || r.target.getAttribute('role') !== 'status') continue;
            if (r.addedNodes.length > 0 && 뜬때 < 0) 뜬때 = performance.now();
            if (r.removedNodes.length > 0 && 뜬때 >= 0) {
              observer.disconnect();
              resolve(performance.now() - 뜬때);
            }
          }
        }).observe(document.body, { childList: true, subtree: true });
      }),
    }));
    await page.getByLabel('검색어').fill(params.shortQuery);
    await page.getByRole('button', { name: '검색' }).click();
    const 잰초 = (await 잼.evaluate((m) => m.머문시간)) / 1000;
    const 오차안이면기대값 = Math.abs(잰초 - expected.seconds) <= params.toleranceSeconds ? expected.seconds : 잰초;
    await verify('처리 결과 토스트는 3초간 보이고 사라진다', 오차안이면기대값, expected.seconds);
  });
});
