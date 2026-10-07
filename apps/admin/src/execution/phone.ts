// 안드로이드 디바이스 하나를 한 번에 한 일만 쓰게 하는 잠금 (SPEC 실행 §3.2 「디바이스 줄」)
// 같은 디바이스에 연결 둘이 겹치면 뒤 연결이 앞 연결을 가로챈다. 잠금은 관리 서버 메모리에 하나다

let 쓰는중 = false;
const 기다림: (() => void)[] = [];

// 기다리는 것이 있으면 비어 있어도 거절한다 — 줄 선 쪽이 먼저다
export function 폰을바로잡는다(): boolean {
  if (쓰는중 || 기다림.length > 0) return false;
  쓰는중 = true;
  return true;
}

// 기다리는 첫째에게 잠금을 그대로 넘긴다. 풀었다가 다시 잡게 하면 그 틈에 새치기가 들어온다
export function 폰을놓는다(): void {
  const 다음 = 기다림.shift();
  if (다음 === undefined) {
    쓰는중 = false;
    return;
  }
  다음();
}

export async function 폰차례<T>(일: () => Promise<T>): Promise<T> {
  if (쓰는중 || 기다림.length > 0) {
    await new Promise<void>((깨운다) => 기다림.push(깨운다));
  } else {
    쓰는중 = true;
  }
  try {
    return await 일();
  } finally {
    폰을놓는다();
  }
}
