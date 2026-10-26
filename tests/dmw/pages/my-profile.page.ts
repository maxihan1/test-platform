import type { Locator, Page } from '@playwright/test';

export class 회원정보수정화면 {
  static readonly 주소 = '/my/profile';

  readonly 큰제목: Locator;
  readonly 재확인안내: Locator;
  readonly 비밀번호칸: Locator;
  readonly 비밀번호확인버튼: Locator;
  readonly 재확인오류: Locator;
  readonly 아이디칸: Locator;
  readonly 이름칸: Locator;
  readonly 이메일칸: Locator;
  readonly 휴대폰칸: Locator;
  readonly 관심분야: Locator;
  readonly 사진파일칸: Locator;
  readonly 사진미리보기: Locator;
  readonly 올린사진미리보기: Locator;
  readonly 기본이미지로: Locator;
  readonly 저장버튼: Locator;

  constructor(private readonly page: Page) {
    this.큰제목 = page.getByRole('heading', { level: 1, name: '회원정보 수정' });
    this.재확인안내 = page.getByText('회원정보를 보호하기 위해 비밀번호를 다시 입력해 주세요.', { exact: true });
    this.비밀번호칸 = page.getByLabel('비밀번호');
    this.비밀번호확인버튼 = page.getByRole('button', { name: '비밀번호 확인', exact: true });
    this.재확인오류 = page.locator('.error-text').filter({ hasText: /\S/ });
    this.아이디칸 = page.getByLabel('아이디', { exact: true });
    this.이름칸 = page.getByLabel('이름');
    this.이메일칸 = page.getByLabel('이메일');
    this.휴대폰칸 = page.getByLabel('휴대폰', { exact: true });
    this.관심분야 = page.getByRole('group', { name: '관심 분야' });
    this.사진파일칸 = page.getByLabel('프로필 사진', { exact: true });
    this.사진미리보기 = page.getByRole('img', { name: '프로필 사진 미리보기' });
    this.올린사진미리보기 = this.사진미리보기.and(page.locator('img[src^="data:image/png"]'));
    this.기본이미지로 = page.getByRole('button', { name: '기본 이미지로', exact: true });
    this.저장버튼 = page.getByRole('button', { name: '저장', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(회원정보수정화면.주소);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.비밀번호확인버튼.or(this.저장버튼).waitFor();
  }

  async 비밀번호확인(비밀번호: string): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => r.url().includes('/api/me/verify-password'));
    await this.비밀번호칸.fill(비밀번호);
    await this.비밀번호확인버튼.click();
    await 응답;
  }

  async 수정칸까지(비밀번호: string): Promise<void> {
    await this.비밀번호확인(비밀번호);
    await this.저장버튼.waitFor();
  }

  async 사진미리보기주소(): Promise<string> {
    return (await this.사진미리보기.getAttribute('src')) ?? '';
  }

  async 사진올리기(이름: string, 바이트수: number): Promise<void> {
    await this.사진파일칸.evaluate((칸, [파일이름, 크기]) => {
      const 바탕 = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='), (글자) => 글자.charCodeAt(0));
      const 덧칸 = Math.max(0, (크기 as number) - 바탕.length - 12);
      const 덩어리 = new Uint8Array(12 + 덧칸);
      const 보기 = new DataView(덩어리.buffer);
      보기.setUint32(0, 덧칸);
      덩어리.set([0x74, 0x45, 0x58, 0x74], 4);
      let 값 = 0xffffffff;
      for (let i = 4; i < 8 + 덧칸; i += 1) {
        값 ^= 덩어리[i];
        for (let k = 0; k < 8; k += 1) 값 = (값 >>> 1) ^ (0xedb88320 & -(값 & 1));
      }
      보기.setUint32(8 + 덧칸, (값 ^ 0xffffffff) >>> 0);
      const 몸 = new Uint8Array(바탕.length + 덩어리.length);
      몸.set(바탕.subarray(0, 33), 0);
      몸.set(덩어리, 33);
      몸.set(바탕.subarray(33), 33 + 덩어리.length);
      const 모음 = new DataTransfer();
      모음.items.add(new File([몸], 파일이름 as string, { type: 'image/png' }));
      (칸 as HTMLInputElement).files = 모음.files;
      칸.dispatchEvent(new Event('change', { bubbles: true }));
    }, [이름, 바이트수] as const);
  }
}
