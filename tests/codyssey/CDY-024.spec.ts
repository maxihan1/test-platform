import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-024',
  name: '공지사항 목록에서 공지를 누르면 상세가 열리고 「목록」을 누르면 목록으로 돌아온다',
  precondition: ['공지사항 목록에 공지가 보인다'],
  params: null,
  expected: z.object({
    listPath: z.string().describe('공지사항 목록 주소 경로').default('/board/noticeGoList'),
    detailPath: z.string().describe('공지 상세 주소 경로').default('/board/noticeDetail'),
    listButtonVisible: z.boolean().describe('상세에 「목록」 버튼이 보일지 여부').default(true),
    listTitle: z.string().describe('목록으로 돌아온 화면의 제목').default('공지사항'),
  }),
});

test(spec, async ({ page, expected }) => {
  const 제목들 = page.getByRole('heading', { level: 3 });
  let 첫제목 = '';

  await test.step('공지사항 목록을 연다', async () => {
    await page.goto('/board/noticeGoList');
    await 제목들.first().waitFor();
    첫제목 = (await 제목들.first().innerText()).trim();
    await verify('공지사항 목록에 공지가 보인다', (await 제목들.count()) > 0, true, { blocker: true });
  });

  await test.step('첫 공지의 제목을 누른다', async () => {
    await 제목들.first().click();
    await page.getByRole('button', { name: '목록', exact: true }).waitFor();
    await verify(
      '공지를 누르면 같은 제목의 상세가 열리고 「목록」 버튼이 보인다',
      {
        detailPath: new URL(page.url()).pathname,
        titleShown: await page.getByRole('heading', { name: 첫제목, exact: true }).first().isVisible(),
        listButtonVisible: await page.getByRole('button', { name: '목록', exact: true }).isVisible(),
      },
      { detailPath: expected.detailPath, titleShown: true, listButtonVisible: expected.listButtonVisible },
    );
  });

  await test.step('「목록」을 누른다', async () => {
    await page.getByRole('button', { name: '목록', exact: true }).click();
    await page.getByRole('button', { name: '목록', exact: true }).waitFor({ state: 'hidden' });
    await 제목들.first().waitFor();
    await verify(
      '「목록」을 누르면 공지사항 목록으로 돌아온다',
      { path: new URL(page.url()).pathname, title: await page.getByRole('heading', { level: 1 }).innerText() },
      { path: expected.listPath, title: expected.listTitle },
    );
  });
});
