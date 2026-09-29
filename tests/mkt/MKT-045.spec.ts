import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-045',
  name: '내가 쓴 글을 확인 창에서 「삭제」하면 목록으로 가서 「삭제되었습니다」가 보이고 그 글이 목록에서 사라진다',
  precondition: ['테스트 회원으로 로그인해 지울 글을 하나 썼다'],
  params: z.object({
    loginId: z.string().min(1).describe('테스트 회원 아이디').optional(),
    loginPassword: z.string().min(1).describe('테스트 회원 비밀번호').optional().meta({ secret: true }),
    postTitle: z.string().min(2).describe('지울 글 제목 앞부분 — 뒤에 시각이 붙는다').default('XBRD 삭제 확인'),
    postContent: z.string().min(10).describe('지울 글 본문').default('게시글 삭제를 확인하려고 쓴 글입니다. 곧 지웁니다.'),
  }),
  expected: z.object({
    confirmText: z
      .string()
      .describe('삭제 확인 창 문구')
      .default('게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.'),
    listPath: z.string().describe('지운 뒤 가 있을 목록 주소').default('/board'),
    toast: z.string().describe('지운 뒤 나와야 할 토스트 문구').default('삭제되었습니다'),
    remaining: z.number().describe('지운 뒤 목록에 남은 그 글 줄 수').default(0),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 제목 = `${params.postTitle} ${Date.now()}`;
  let 글번호 = 0;

  await test.step('테스트 계정으로 로그인하고 지울 글을 하나 등록한다', async () => {
    await page.goto('/login');
    await page.getByLabel('아이디').fill(params.loginId ?? '');
    await page.getByLabel('비밀번호').fill(params.loginPassword ?? '');
    await page.getByRole('button', { name: '로그인' }).click();
    await page.getByRole('banner').getByRole('button', { name: '알림' }).waitFor();
    const 응답 = await page.request.post('/api/posts', {
      data: { category: '자유', title: 제목, content: params.postContent, images: [] },
    });
    글번호 = Number((await 응답.json()).id);
  });

  await test.step('방금 등록한 글의 상세가 열리고 제목이 보이는지 확인한다', async () => {
    await page.goto(`/board/${글번호}`);
    await page.getByRole('button', { name: /좋아요/ }).waitFor();
    await verify('방금 등록한 글의 상세 제목이 보인다', await page.getByRole('heading', { level: 1 }).innerText(), 제목, { blocker: true });
  });

  await test.step('상세 본문 아래 「삭제」를 누른다', async () => {
    await page.locator('.post-actions').getByRole('button', { name: '삭제' }).click();
    const 확인창 = page.getByRole('dialog');
    await 확인창.getByRole('button', { name: '취소' }).waitFor();
    await verify(
      '「삭제」를 누르면 확인 창에 「게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.」가 보인다',
      await 확인창.getByRole('paragraph').innerText(),
      expected.confirmText,
    );
  });

  await test.step('확인 창에서 「삭제」를 누른다', async () => {
    await page.getByRole('dialog').getByRole('button', { name: '삭제' }).click();
    const 토스트 = page.getByRole('status');
    await 토스트.waitFor();
    await page.getByRole('row').getByRole('link').first().waitFor();
    await verify(
      '확인 창에서 「삭제」를 누르면 목록으로 가서 토스트 「삭제되었습니다」가 보이고 지운 글이 목록에 없다',
      {
        주소: new URL(page.url()).pathname,
        토스트: await 토스트.innerText(),
        남은줄: await page.getByRole('link', { name: 제목 }).count(),
      },
      { 주소: expected.listPath, 토스트: expected.toast, 남은줄: expected.remaining },
    );
  });
});
