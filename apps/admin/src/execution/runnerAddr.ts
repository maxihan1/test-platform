// admin 이 부르는 러너들의 주소 · 머리 · 짧은 생존 확인. 산출물 받아 오기(artifactFile)도 써서 실행 코드를 끌어오지 않는 맨 아래에 둔다

// 컨테이너에서는 compose 가 넣어 준다(.env 로 바꾼다 — 서버 러너 · 터널로 이은 맥 러너). 호스트에서 손으로 돌릴 때가 이 기본값이다
export function runnerUrl(): string {
  return process.env.RUNNER_URL || 'http://localhost:4000';
}

// 진행 · 파일을 물을 러너들. 로컬 러너가 있고 정식 실행 러너와 다를 때만 둘이다
export function 러너들(): string[] {
  const 로컬 = process.env.LOCAL_RUNNER_URL;
  return 로컬 && 로컬 !== runnerUrl() ? [runnerUrl(), 로컬] : [runnerUrl()];
}

// RUNNER_TOKEN 을 건 러너는 /health 밖의 요청을 토큰 없이 거절한다. 값 하나를 모든 러너 호출에 싣는다 (SPEC 도메인/러너 §5.2 「러너 토큰 · 파일 내주기」)
export function 러너머리(): Record<string, string> {
  const 토큰 = process.env.RUNNER_TOKEN ?? '';
  return 토큰 === '' ? {} : { authorization: `Bearer ${토큰}` };
}

// 터널로 이은 맥이 잠들면 서버 쪽 터널 끝이 연결을 받고 답을 안 줘 긴 호출이 제한 시간까지 매달린다. 보내기 전에 짧게 묻는다 —
// 무슨 상태 코드든 답하면 깨어 있는 것이다. 러너 고장을 가리는 일은 응답 쪽이 한다
export async function 답하나(주소: string): Promise<boolean> {
  try {
    await (await fetch(`${주소}/health`, { signal: AbortSignal.timeout(2_000) })).arrayBuffer();
    return true;
  } catch {
    return false;
  }
}
