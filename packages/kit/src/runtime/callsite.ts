// 스택에서 테스트 소스의 위치를 찾는다. 실패 지점을 줄 번호로 돌려줘야 화면이 그 줄을 열 수 있다 (SPEC §8.4)

const FRAME = /(?:\(|@|\s)(?:file:\/\/)?(\/[^\s()]+?):(\d+):\d+\)?$/;

// 라이브러리 프레임은 건너뛴다. 사용자가 볼 줄은 테스트 파일의 줄이다.
// kit 자신의 프레임은 Error.captureStackTrace로 애초에 스택에서 지우고 들어온다 (verify.ts)
function isOwnFrame(file: string): boolean {
  return file.includes('/node_modules/');
}

function frames(err: Error): { file: string; line: number }[] {
  const out: { file: string; line: number }[] = [];
  for (const raw of (err.stack ?? '').split('\n').slice(1)) {
    const m = FRAME.exec(raw.trim());
    if (m && !isOwnFrame(m[1])) out.push({ file: m[1], line: Number(m[2]) });
  }
  return out;
}

// 케이스가 Page Object 메서드를 부르면 첫 프레임은 pages/*.page.ts 다. 화면은 케이스 파일을 발췌하므로 spec 프레임을 먼저 고른다
function caller(err: Error): { file: string; line: number } | undefined {
  const all = frames(err);
  return all.find((f) => f.file.endsWith('.spec.ts')) ?? all[0];
}

export function callerLine(err: Error): number | undefined {
  return caller(err)?.line;
}

export function callerFile(err: Error): string | undefined {
  return caller(err)?.file;
}
