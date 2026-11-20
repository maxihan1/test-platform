// gameFns.test.ts 가 쓰는 가짜 화면 객체 — 폴더 이름(pages)과 클래스 · 함수 이름이 스택에 찍히는 꼴을 본다
// 줄 번호를 읽는 검사가 있다 — 클래스 둘의 차례를 바꾸지 않는다

interface 누르는것 {
  click(target: string): Promise<unknown>;
}

export class 로비화면 {
  static async 열기(game: 누르는것): Promise<void> {
    await game.click('/Lobby/Enter');
  }
}

export class 던전화면 {
  constructor(private readonly game: 누르는것) {}

  static async 열기(game: 누르는것): Promise<던전화면> {
    await Promise.resolve();
    await game.click('/Hud/Open');
    return new 던전화면(game);
  }

  async 공격(): Promise<void> {
    await Promise.resolve();
    await this.game.click('/Hud/Attack');
  }

  async 스스로던진다(): Promise<void> {
    await this.game.click('/Hud/Attack');
    throw new Error('공격 뒤에 피해 숫자가 뜨지 않았다');
  }

  async 없으면넘어간다(): Promise<void> {
    const 누르기 = async (): Promise<unknown> => this.game.click('/Hud/Attack');
    await 누르기().catch(() => undefined);
  }
}
