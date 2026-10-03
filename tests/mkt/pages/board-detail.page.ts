import type { Locator, Page } from '@playwright/test';

export class 게시글상세 {
  constructor(private readonly page: Page) {}

  get 글(): Locator {
    return this.page.getByRole('article');
  }

  get 제목(): Locator {
    return this.글.getByRole('heading', { level: 1 });
  }

  get 분류(): Locator {
    return this.글.getByText(/^분류 /);
  }

  get 작성자(): Locator {
    return this.글.getByText(/^작성자 /);
  }

  get 작성일(): Locator {
    return this.글.getByText(/^작성일 /);
  }

  get 조회수(): Locator {
    return this.글.getByText(/^조회수 \d+$/);
  }

  get 본문(): Locator {
    return this.글.locator('.post-body');
  }

  get 첨부이미지(): Locator {
    return this.글.getByRole('img', { name: /^첨부 이미지/ });
  }

  get 좋아요(): Locator {
    return this.글.getByRole('button', { name: /좋아요/ });
  }

  get 좋아요수(): Locator {
    return this.좋아요.locator('.like-count');
  }

  get 링크복사(): Locator {
    return this.글.getByRole('button', { name: '링크 복사', exact: true });
  }

  get 수정(): Locator {
    return this.글.getByRole('link', { name: '수정', exact: true });
  }

  get 삭제(): Locator {
    return this.글.locator('.post-actions').getByRole('button', { name: '삭제', exact: true });
  }

  get 목록(): Locator {
    return this.글.getByRole('link', { name: '목록', exact: true });
  }

  get 없는글안내(): Locator {
    return this.page.getByText('삭제되었거나 존재하지 않는 게시글입니다');
  }

  get 로그인확인문구(): Locator {
    return this.page.getByRole('dialog', { name: '확인' }).getByText('로그인이 필요합니다. 로그인 화면으로 이동할까요?');
  }

  get 삭제모달문구(): Locator {
    return this.page.getByRole('dialog', { name: '게시글 삭제' }).getByText('게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.');
  }

  get 눌린좋아요(): Locator {
    return this.글.getByRole('button', { name: /좋아요/, pressed: true });
  }

  get 안눌린좋아요(): Locator {
    return this.글.getByRole('button', { name: /좋아요/, pressed: false });
  }

  get 권한없음제목(): Locator {
    return this.page.getByRole('heading', { name: '권한이 없습니다' });
  }

  get 댓글영역(): Locator {
    return this.page.getByRole('region', { name: '댓글' });
  }

  get 댓글제목(): Locator {
    return this.댓글영역.getByRole('heading', { level: 2 });
  }

  get 댓글들(): Locator {
    return this.댓글영역.locator('li.comment');
  }

  댓글(내용: string): Locator {
    return this.댓글영역.locator('li.comment', { hasText: 내용 });
  }

  get 댓글시각들(): Locator {
    return this.댓글들.locator('.when');
  }

  get 댓글작성자들(): Locator {
    return this.댓글들.locator('.who');
  }

  get 댓글내용들(): Locator {
    return this.댓글들.locator('.text');
  }

  get 삭제된댓글(): Locator {
    return this.댓글영역.locator('li.comment.deleted');
  }

  get 새댓글칸(): Locator {
    return this.댓글영역.getByRole('textbox', { name: '댓글 입력', exact: true });
  }

  get 새댓글글자수(): Locator {
    return this.댓글영역.locator('.new-comment .counter');
  }

  get 새댓글등록(): Locator {
    return this.댓글영역.locator('.new-comment').getByRole('button', { name: '등록', exact: true });
  }

  get 로그인안내(): Locator {
    return this.댓글영역.getByRole('link', { name: '댓글을 쓰려면 로그인하세요' });
  }

  답글버튼(댓글내용: string): Locator {
    return this.댓글(댓글내용).getByRole('button', { name: '답글', exact: true });
  }

  수정버튼(댓글내용: string): Locator {
    return this.댓글(댓글내용).getByRole('button', { name: '수정', exact: true });
  }

  삭제버튼(댓글내용: string): Locator {
    return this.댓글(댓글내용).getByRole('button', { name: '삭제', exact: true });
  }

  답글칸(댓글내용: string): Locator {
    return this.댓글(댓글내용).getByRole('textbox', { name: '답글 입력', exact: true });
  }

  수정칸(댓글내용: string): Locator {
    return this.댓글(댓글내용).getByRole('textbox', { name: '댓글 수정', exact: true });
  }

  저장버튼(댓글내용: string): Locator {
    return this.댓글(댓글내용).getByRole('button', { name: '저장', exact: true });
  }

  취소버튼(댓글내용: string): Locator {
    return this.댓글(댓글내용).getByRole('button', { name: '취소', exact: true });
  }

  답글등록(댓글내용: string): Locator {
    return this.댓글(댓글내용).getByRole('button', { name: '등록', exact: true });
  }

  get 수정표시(): Locator {
    return this.댓글영역.locator('.edited');
  }

  async 열기(번호: number | string): Promise<void> {
    await this.page.goto(`/board/${번호}`);
  }

  async 글이뜰때까지(): Promise<void> {
    await this.제목.waitFor();
    await this.댓글들.first().waitFor().catch(() => undefined);
  }

  async 댓글쓴다(내용: string): Promise<void> {
    await this.새댓글칸.fill(내용);
    await this.새댓글등록.click();
  }
}
