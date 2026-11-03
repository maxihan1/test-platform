// 안드로이드 디바이스 하나를 한 번에 한 일만 쓰게 하는 잠금 (SPEC 실행 §3.2 「디바이스 줄」)
// 같은 디바이스에 연결 둘이 겹치면 뒤 연결이 앞 연결을 가로챈다. 잠금은 관리 서버 메모리에 줄마다 하나다

function 줄을만든다() {
  let 쓰는중 = false;
  const 기다림: (() => void)[] = [];

  // 기다리는 것이 있으면 비어 있어도 거절한다 — 줄 선 쪽이 먼저다
  function 바로잡는다(): boolean {
    if (쓰는중 || 기다림.length > 0) return false;
    쓰는중 = true;
    return true;
  }

  // 기다리는 첫째에게 잠금을 그대로 넘긴다. 풀었다가 다시 잡게 하면 그 틈에 새치기가 들어온다
  function 놓는다(): void {
    const 다음 = 기다림.shift();
    if (다음 === undefined) {
      쓰는중 = false;
      return;
    }
    다음();
  }

  async function 차례<T>(일: () => Promise<T>): Promise<T> {
    if (쓰는중 || 기다림.length > 0) {
      await new Promise<void>((깨운다) => 기다림.push(깨운다));
    } else {
      쓰는중 = true;
    }
    try {
      return await 일();
    } finally {
      놓는다();
    }
  }

  return { 바로잡는다, 놓는다, 차례 };
}

const 디바이스줄 = 줄을만든다();
export const 폰을바로잡는다 = 디바이스줄.바로잡는다;
export const 폰을놓는다 = 디바이스줄.놓는다;
export const 폰차례 = 디바이스줄.차례;

/**
 * 실제 폰 모바일 웹(Chrome 연결)의 줄 — 디바이스 줄과 따로 선다. 게임 실행이 실행 내내 디바이스 줄을 쥐어도 모바일 웹이 막히지 않게 하고,
 * 이 서버의 실제 폰 항목끼리는 하나씩 돌아 서로 빈 폰을 빼앗다 미실행이 되지 않게 한다. 폰을 잡고 놓는 것은 그대로 팜이 가른다 (도메인/실행 §3.2 「모바일 웹 실행 위치」)
 */
// ponytail: 실제 폰 Chrome 항목은 서버 하나에 한 번에 하나다. 팜 폰이 늘어 나란히 돌려야 하면 줄 대신 폰 수만큼의 자리
export const Chrome차례 = 줄을만든다().차례;
