import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-044',
  name: '「링크 복사」를 누르면 토스트 「링크를 복사했습니다」가 보이고 클립보드에 그 글 주소가 담긴다',
  precondition: ['클립보드 권한을 허용한 브라우저로 게시글 상세를 열었다'],
  params: z.object({
    postPath: z.string().min(1).describe('링크를 복사할 게시글 상세 주소').default('/board/45'),
  }),
  expected: z.object({
    toast: z.string().describe('나와야 할 토스트 문구').default('링크를 복사했습니다'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  await test.step('클립보드 권한을 허용하고 게시글 상세를 연다', async () => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(params.postPath);
    await page.getByRole('button', { name: '링크 복사' }).waitFor();
  });

  await test.step('「링크 복사」를 누른다', async () => {
    await page.getByRole('button', { name: '링크 복사' }).click();
    const 토스트 = page.getByRole('status');
    await 토스트.waitFor();
    await verify(
      '「링크 복사」를 누르면 토스트 「링크를 복사했습니다」가 보이고 클립보드에 그 글 주소가 담긴다',
      {
        토스트: await 토스트.innerText(),
        클립보드: await page.evaluate(() => navigator.clipboard.readText()),
      },
      {
        토스트: expected.toast,
        클립보드: new URL(params.postPath, page.url()).href,
      },
    );
  });
});
