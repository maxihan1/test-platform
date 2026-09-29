import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-043',
  name: '오늘 쓴 글은 게시판 목록 작성일 칸에 「14:05」처럼 시각만 보인다',
  precondition: ['테스트 회원으로 로그인해 오늘 날짜로 글을 하나 썼다 — 확인이 끝나면 그 글을 지운다'],
  params: z.object({
    loginId: z.string().min(1).describe('테스트 회원 아이디').optional(),
    loginPassword: z.string().min(1).describe('테스트 회원 비밀번호').optional().meta({ secret: true }),
    postTitle: z.string().min(2).describe('시험용 글 제목 앞부분 — 뒤에 시각이 붙는다').default('XBRD 작성일 확인'),
    postContent: z.string().min(10).describe('시험용 글 본문').default('작성일 표기를 확인하려고 쓴 글입니다. 곧 지웁니다.'),
  }),
  expected: z.object({
    todayDate: z.string().describe('오늘 쓴 글의 작성일 모양 — 기획서 예시').default('14:05'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 제목 = `${params.postTitle} ${Date.now()}`;
  let 글번호 = 0;

  await test.step('테스트 계정으로 로그인하고 지난 실행이 남긴 시험용 글을 지운다', async () => {
    await page.goto('/login');
    await page.getByLabel('아이디').fill(params.loginId ?? '');
    await page.getByLabel('비밀번호').fill(params.loginPassword ?? '');
    await page.getByRole('button', { name: '로그인' }).click();
    await page.getByRole('banner').getByRole('button', { name: '알림' }).waitFor();
    const 목록 = await page.request.get('/api/posts', { params: { field: 'title', q: params.postTitle, size: 50 } });
    const { items } = (await 목록.json()) as { items: { id: number; title: string }[] };
    for (const 글 of items.filter((g) => g.title.startsWith(`${params.postTitle} `))) {
      await page.request.delete(`/api/posts/${글.id}`);
    }
  });

  try {
    await test.step('오늘 날짜로 글을 하나 등록한다', async () => {
      const 응답 = await page.request.post('/api/posts', {
        data: { category: '자유', title: 제목, content: params.postContent, images: [] },
      });
      글번호 = Number((await 응답.json()).id);
    });

    await test.step('방금 등록한 글이 게시판 목록에 있는지 확인한다', async () => {
      await page.goto('/board');
      await page.getByRole('row').getByRole('link').first().waitFor();
      await verify('방금 등록한 글이 게시판 목록에 한 줄 보인다', await page.getByRole('link', { name: 제목 }).count(), 1, { blocker: true });
    });

    await test.step('게시판 목록에서 방금 쓴 글의 작성일 칸을 본다', async () => {
      const 칸 = (await page.getByRole('columnheader').allInnerTexts()).map((t) => t.trim()).indexOf('작성일');
      const 줄 = page.getByRole('row').filter({ has: page.getByRole('link', { name: 제목 }) });
      const 작성일 = (await 줄.getByRole('cell').nth(칸).innerText()).trim();
      await verify(
        '오늘 쓴 글은 게시판 목록 작성일 칸에 「14:05」처럼 시각만 보인다',
        작성일.replace(/\d/g, '0'),
        expected.todayDate.replace(/\d/g, '0'),
      );
    });
  } finally {
    if (글번호 > 0) await page.request.delete(`/api/posts/${글번호}`);
  }
});
