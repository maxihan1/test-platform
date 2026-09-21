// 판정 개수를 큰 숫자로 그리는 조각 (SPEC §8)
// 색은 거들기만 한다 — 판정은 늘 글자로도 적는다 (DESIGN.md 접근성)

type 칸이름 = '전체' | '통과' | '실패' | '미실행';

interface 집계Props {
  전체: number;
  통과: number;
  실패: number;
  미실행: number;
  부제?: Partial<Record<칸이름, string>>;
}

export function 집계띠({ 전체, 통과, 실패, 미실행, 부제 }: 집계Props) {
  const 칸들: ReadonlyArray<{ 라벨: 칸이름; 값: number; 색: string }> = [
    { 라벨: '전체', 값: 전체, 색: '' },
    { 라벨: '통과', 값: 통과, 색: 'p' },
    { 라벨: '실패', 값: 실패, 색: 'f' },
    { 라벨: '미실행', 값: 미실행, 색: 'n' },
  ];

  return (
    <div className="stats">
      <div className="stats-row">
        {칸들.map((칸) => (
          <div key={칸.라벨} className={칸.색 ? `stat ${칸.색}` : 'stat'}>
            <span className="k">
              {칸.색 ? <i /> : null}
              {칸.라벨}
            </span>
            <div className="v">{칸.값}</div>
            {부제?.[칸.라벨] ? <div className="sub">{부제[칸.라벨]}</div> : null}
          </div>
        ))}
      </div>
      {/* 아무것도 없는데 막대만 그리면 0 을 비율로 읽게 된다 */}
      {전체 > 0 ? (
        <div className="ratio">
          <i className="p" style={{ flexGrow: 통과 }} />
          <i className="f" style={{ flexGrow: 실패 }} />
          <i className="n" style={{ flexGrow: 미실행 }} />
        </div>
      ) : null}
    </div>
  );
}
