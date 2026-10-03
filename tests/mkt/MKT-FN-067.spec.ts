import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 게시판목록 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-067',
  name: '게시판에서 검색 조건과 검색어를 바꿔 검색하면 맞는 글만 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({
    titleKeyword: z.string().min(1).describe('제목 검색어').default('사이즈'),
    contentKeyword: z.string().min(1).describe('내용 검색어').default('사이즈'),
    authorKeyword: z.string().min(1).describe('작성자 검색어').default('김데모'),
    shortKeyword: z.string().min(1).describe('한 글자 검색어').default('가'),
    missingKeyword: z.string().min(1).describe('어떤 글에도 없는 검색어').default('zzzzqq'),
  }),
  expected: z.object({
    shortToast: z.string().describe('한 글자 검색 안내').default('검색어를 2자 이상 입력하세요'),
    emptyResult: z.string().describe('결과 없음 안내와 표 개수').default('검색 결과가 없습니다, 0'),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const 목록 = new 게시판목록(page);
  const 알림 = new 토스트(page);

  await test.step('검색 조건 「제목」을 고르고 검색어를 적어 「검색」을 누른다', async () => {
    await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
    await 목록.열기();
    await 목록.줄이뜰때까지();
    await 목록.검색조건.selectOption({ label: '제목' });
    await 목록.검색한다(params.titleKeyword);
    await 목록.불러오기끝();
    await 목록.일반제목들.first().filter({ hasText: params.titleKeyword }).waitFor();
    const 제목들 = await 목록.일반제목들.allInnerTexts();
    await verify(
      '검색 조건 「제목」으로 검색하면 제목에 검색어가 든 글만 보인다',
      제목들.length > 0 && 제목들.every((t) => t.includes(params.titleKeyword)),
      true,
    );
  });

  await test.step('검색 조건 「내용」을 고르고 검색어를 적어 「검색」을 누른다', async () => {
    const 전체 = (await (await request.get('/api/posts?size=100')).json()).items as { id: number; title: string }[];
    const 맞는제목: string[] = [];
    for (const 글 of 전체) {
      const 상세 = (await (await request.get(`/api/posts/${글.id}`)).json()) as { content: string };
      if (상세.content.includes(params.contentKeyword)) 맞는제목.push(글.title);
    }
    await 목록.검색조건.selectOption({ label: '내용' });
    await 목록.검색한다(params.contentKeyword);
    await 목록.불러오기끝();
    await verify(
      '검색 조건 「내용」으로 검색하면 본문에 검색어가 든 글만 보인다',
      (await 목록.일반제목들.allInnerTexts()).sort().join(' | '),
      맞는제목.sort().join(' | '),
    );
  });

  await test.step('검색 조건 「작성자」를 고르고 검색어를 적어 「검색」을 누른다', async () => {
    await 목록.검색조건.selectOption({ label: '작성자' });
    await 목록.검색한다(params.authorKeyword);
    await 목록.불러오기끝();
    await 목록.작성자칸들.first().filter({ hasText: params.authorKeyword }).waitFor();
    const 작성자들 = await 목록.작성자칸들.allInnerTexts();
    await verify(
      '검색 조건 「작성자」로 검색하면 작성자 이름에 검색어가 든 글만 보인다',
      작성자들.length > 0 && 작성자들.every((t) => t.includes(params.authorKeyword)),
      true,
    );
  });

  await test.step('검색어를 한 글자만 적고 「검색」을 누른다', async () => {
    await 목록.검색한다(params.shortKeyword);
    await verify('검색어를 1자로 검색하면 토스트 「검색어를 2자 이상 입력하세요」가 보인다', await 알림.전체.innerText(), expected.shortToast);
  });

  await test.step('어떤 글에도 없는 검색어를 적어 「검색」을 누른다', async () => {
    await 목록.검색한다(params.missingKeyword);
    await 목록.일반줄.first().waitFor({ state: 'detached' });
    await verify(
      '검색 결과가 없으면 표 대신 「검색 결과가 없습니다」가 보인다',
      [await 목록.빈안내.innerText(), await 목록.표.count()].join(', '),
      expected.emptyResult,
    );
  });
});
