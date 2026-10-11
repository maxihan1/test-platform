import type { Locator, Page } from '@playwright/test';

export class 게시글상세화면 {
  static readonly 주소 = '/board/{id}';

  readonly page: Page;
  readonly 제목: Locator;
  readonly 분류: Locator;
  readonly 작성자: Locator;
  readonly 작성일: Locator;
  readonly 조회수: Locator;
  readonly 본문: Locator;
  readonly 첨부이미지들: Locator;
  readonly 좋아요버튼: Locator;
  readonly 눌린좋아요버튼: Locator;
  readonly 풀린좋아요버튼: Locator;
  readonly 링크복사버튼: Locator;
  readonly 수정링크: Locator;
  readonly 삭제버튼: Locator;
  readonly 목록링크: Locator;
  readonly 없는글안내: Locator;
  readonly 댓글영역: Locator;
  readonly 댓글제목: Locator;
  readonly 댓글줄들: Locator;
  readonly 댓글내용들: Locator;
  readonly 댓글작성자들: Locator;
  readonly 댓글작성시각들: Locator;
  readonly 새댓글영역: Locator;
  readonly 댓글입력칸: Locator;
  readonly 댓글글자수: Locator;
  readonly 댓글등록버튼: Locator;
  readonly 댓글로그인링크: Locator;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('heading', { level: 1 });
    this.분류 = page.getByText(/^분류 \S+/);
    this.작성자 = page.getByText(/^작성자 \S+/);
    this.작성일 = page.getByText(/^작성일 \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    this.조회수 = page.getByText(/^조회수 \d+$/);
    this.본문 = page.locator('.post-body');
    this.첨부이미지들 = page.getByRole('img', { name: /^첨부 이미지 \d+$/ });
    this.좋아요버튼 = page.getByRole('button', { name: /좋아요/ });
    this.눌린좋아요버튼 = page.getByRole('button', { name: /좋아요/, pressed: true });
    this.풀린좋아요버튼 = page.getByRole('button', { name: /좋아요/, pressed: false });
    this.링크복사버튼 = page.getByRole('button', { name: '링크 복사', exact: true });
    this.수정링크 = page.getByRole('link', { name: '수정', exact: true });
    this.삭제버튼 = page.locator('.post-actions').getByRole('button', { name: '삭제', exact: true });
    this.목록링크 = page.getByRole('link', { name: '목록', exact: true });
    this.없는글안내 = page.getByText('삭제되었거나 존재하지 않는 게시글입니다', { exact: true });
    this.댓글영역 = page.getByRole('region', { name: '댓글' });
    this.댓글제목 = this.댓글영역.getByRole('heading', { name: /^댓글 \d+$/ });
    this.댓글줄들 = this.댓글영역.locator('li.comment');
    this.댓글내용들 = this.댓글영역.locator('li.comment p.text');
    this.댓글작성자들 = this.댓글영역.locator('li.comment .who');
    this.댓글작성시각들 = this.댓글영역.locator('li.comment .when');
    this.새댓글영역 = this.댓글영역.locator('.new-comment');
    this.댓글입력칸 = this.새댓글영역.getByRole('textbox', { name: '댓글 입력' });
    this.댓글글자수 = this.새댓글영역.getByText(/^\d+\/300$/);
    this.댓글등록버튼 = this.새댓글영역.getByRole('button', { name: '등록', exact: true });
    this.댓글로그인링크 = this.댓글영역.getByRole('link', { name: '댓글을 쓰려면 로그인하세요', exact: true });
  }

  댓글(번호: number): Locator {
    return this.댓글영역.locator(`li.comment[data-id="${번호}"]`);
  }

  댓글본문(줄: Locator): Locator {
    return 줄.locator('p.text');
  }

  댓글작성자(줄: Locator): Locator {
    return 줄.locator('.who');
  }

  댓글작성시각(줄: Locator): Locator {
    return 줄.locator('.when');
  }

  답글버튼(줄: Locator): Locator {
    return 줄.getByRole('button', { name: '답글', exact: true });
  }

  댓글수정버튼(줄: Locator): Locator {
    return 줄.getByRole('button', { name: '수정', exact: true });
  }

  댓글삭제버튼(줄: Locator): Locator {
    return 줄.getByRole('button', { name: '삭제', exact: true });
  }

  답글입력칸(줄: Locator): Locator {
    return 줄.getByRole('textbox', { name: '답글 입력' });
  }

  수정입력칸(줄: Locator): Locator {
    return 줄.getByRole('textbox', { name: '댓글 수정' });
  }

  저장버튼(줄: Locator): Locator {
    return 줄.getByRole('button', { name: '저장', exact: true });
  }

  취소버튼(줄: Locator): Locator {
    return 줄.getByRole('button', { name: '취소', exact: true });
  }

  async 열기(번호: number): Promise<void> {
    await this.page.goto(`/board/${번호}`);
    await this.좋아요버튼.or(this.없는글안내).first().waitFor();
  }

  async 댓글불러오기기다리기(): Promise<void> {
    await this.댓글제목.waitFor();
  }

  async 조회수읽기(): Promise<number> {
    return Number((await this.조회수.innerText()).replace(/\D/g, ''));
  }

  async 좋아요수읽기(): Promise<number> {
    return Number((await this.좋아요버튼.innerText()).replace(/\D/g, ''));
  }

  async 좋아요글자(): Promise<string> {
    return this.좋아요버튼.innerText();
  }

  async 좋아요누르고기다리기(눌림: boolean): Promise<void> {
    const 이전상태 = 눌림 ? this.풀린좋아요버튼 : this.눌린좋아요버튼;
    await 이전상태.click();
    await (눌림 ? this.눌린좋아요버튼 : this.풀린좋아요버튼).waitFor();
  }

  async 댓글수읽기(): Promise<number> {
    return Number((await this.댓글제목.innerText()).replace(/\D/g, ''));
  }

  async 댓글쓰기(내용: string): Promise<void> {
    await this.댓글입력칸.fill(내용);
    await this.댓글등록버튼.click();
  }

  async 글자수자리(): Promise<{ 글자: string; 오른쪽: boolean; 아래: boolean }> {
    const 칸 = await this.댓글입력칸.boundingBox();
    const 숫자 = await this.댓글글자수.boundingBox();
    if (칸 === null || 숫자 === null) throw new Error('댓글 입력칸이나 글자 수 자리를 읽지 못했다');
    return {
      글자: await this.댓글글자수.innerText(),
      오른쪽: 숫자.x + 숫자.width >= 칸.x + 칸.width - 24,
      아래: 숫자.y >= 칸.y + 칸.height - 2,
    };
  }

  async 클립보드읽기(): Promise<string> {
    return this.page.evaluate(() => navigator.clipboard.readText());
  }

  async 보이는요소들(): Promise<string[]> {
    const 이름과칸: [string, Locator][] = [
      ['제목', this.제목],
      ['분류', this.분류],
      ['작성자', this.작성자],
      ['작성일', this.작성일],
      ['조회수', this.조회수],
      ['본문', this.본문],
      ['첨부 이미지', this.첨부이미지들.first()],
    ];
    const 보이는 = [];
    for (const [이름, 칸] of 이름과칸) if (await 칸.isVisible()) 보이는.push(이름);
    return 보이는;
  }
}
