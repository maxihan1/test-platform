// E2E 마법사 왼쪽 띠의 단계 이름과 지금 단계 아래 안내 칸 · 본문 제목 — 글은 도메인/시나리오 §8.11 「안내 칸 글」 표 그대로다

import { use말 } from './i18n.js';
import type { FlowJob } from './scenarioApi.js';
import { 체크그림 } from './SettingsWizardSteps.js';

export type 마법사단계 = 'start' | 'ai' | 'steps' | 'values' | 'trial' | 'save';

export const 단계이름: Record<마법사단계, string> = {
  start: '시작 방법',
  ai: 'AI 추천',
  steps: '단계§마법사',
  values: '값 연결',
  trial: '시험 실행',
  save: '저장§마법사',
};

/** 본문 머리의 제목 · 설명 */
export const 단계제목: Record<마법사단계, [string, string]> = {
  start: ['새 E2E 시나리오를 만듭니다', '케이스 여러 개를 이어 붙여 사람이 실제로 쓰는 흐름을 처음부터 끝까지 확인합니다'],
  ai: ['AI 가 고른 흐름 후보입니다', '하나를 고르면 단계가 채워집니다. 고른 뒤에 빼거나 더할 수 있습니다'],
  steps: ['단계를 차례로 이어 붙입니다', '맨 뒤 단계에서 이어지는 케이스를 위에 먼저 보여 줍니다'],
  values: ['단계 사이에 넘길 값을 확인합니다', '찾아서 미리 채워 둔 연결이 맞는지만 봅니다'],
  trial: ['끝까지 이어지는지 돌려 봅니다', '저장하기 전에 대상 서버에서 한 번 돌립니다'],
  save: ['이름을 정하고 저장합니다', '수정할 것이 있으면 줄 끝의 「수정」을 누릅니다'],
};

interface 판 {
  /** 그림 칩. 끝 칩 앞에 화살을 둔다. hot 은 짚어 보일 칩 차례 */
  칩들: string[];
  hot: number;
  그림글: string;
  줄들: string[];
  표: string;
}

/** @param 재료 AI 추천 일이 담은 재료 수. 첫 응답 전이면 null — 그림에 수를 빼고 그린다 */
export function 안내칸({ 단계, 재료 }: { 단계: 마법사단계; 재료: FlowJob['material'] | null }) {
  const t = use말();
  const 판들: Record<마법사단계, 판> = {
    start: {
      칩들: [t('로그인'), t('장바구니 담기'), t('주문하기'), t('주문 상세')],
      hot: 2,
      그림글: '한 사람이 실제로 쓰는 차례 그대로 돌립니다',
      줄들: [
        '기능 테스트 스크립트만 단계로 쓸 수 있습니다. UI 테스트는 고를 수 없습니다',
        '시나리오 하나는 디바이스 하나입니다. PC 와 모바일을 둘 다 보려면 시나리오를 따로 만듭니다',
        'AI 추천은 후보만 냅니다. 어떤 흐름이 중요한지는 직접 고릅니다',
      ],
      표: '디바이스는 나중에 바꿀 수 있습니다',
    },
    ai: {
      칩들: [
        t('요구사항 표'),
        재료 === null ? t('테스트') : t('테스트 {수}건', { 수: 재료.cases }),
        재료 === null ? t('화면 연결') : t('화면 연결 {수}건', { 수: 재료.links }),
        t('흐름 후보'),
      ],
      hot: 3,
      그림글: 'AI 는 이것들을 읽고 고릅니다',
      줄들: [
        '테스트 스크립트에서 뽑아 둔 이름 · 요구 번호 · 화면을 읽습니다. 스크립트 원문을 통째로 넘기지는 않습니다',
        '있는 케이스를 고르고 잇기만 합니다. 새 케이스를 만들지 않습니다',
        '작성 에이전트가 처리해 몇 분 걸립니다',
      ],
      표: '고른 뒤에 단계를 빼거나 더할 수 있습니다',
    },
    steps: {
      칩들: [t('상품 상세'), t('장바구니 담기'), '/cart'],
      hot: 1,
      그림글: '맨 뒤 단계가 머무는 화면에서 갈 수 있는 화면의 케이스입니다',
      줄들: [
        '다음 단계 추천은 화면 이동 기록으로 고릅니다',
        '정상 케이스를 먼저 올립니다. 경계 · 예외 케이스는 「케이스 찾기」로 찾습니다',
        '화면 이동 기록이 없는 화면에서는 추천이 비어 있습니다. 그때도 「케이스 찾기」로 고릅니다',
        '계정을 미리 심거나 응답을 바꿔치기해야 하면 「API 호출」 · 「모킹 켜기」를 끼웁니다',
      ],
      표: '저장하기 전까지 순서를 바꿀 수 있습니다',
    },
    values: {
      칩들: [t('주문하기'), t('주문 상세 열기')],
      hot: 1,
      그림글: '앞 단계가 받은 값을 뒤 단계로 넘깁니다',
      줄들: [
        '서비스 지도(케이스가 실제로 부른 API 기록)에서 찾아 미리 채웠습니다',
        '값 연결은 첫 확인이 나오기 전 사전 단계에서만 적용됩니다',
        '비워 둔 입력 칸은 그 케이스에 저장해 둔 값으로 실행합니다',
      ],
      표: '이 시나리오에서만 쓰는 값입니다',
    },
    trial: {
      칩들: [t('대상 서버'), t('결과')],
      hot: 1,
      그림글: '저장하기 전에 한 번 돌려 봅니다',
      줄들: [
        '내 컴퓨터 테스트 실행기가 켜져 있으면 브라우저가 움직이는 모습을 볼 수 있습니다',
        '멈추면 어느 단계에서 왜 멈췄는지 보여 주고 고칠 곳으로 데려갑니다',
        '값 연결이 실제로 쓰였는지도 함께 알려 줍니다',
      ],
      표: '건너뛰어도 저장할 수 있습니다',
    },
    save: {
      칩들: ['v1', 'v2', 'v3'],
      hot: 2,
      그림글: '고쳐서 저장할 때마다 버전이 하나씩 쌓입니다',
      줄들: ['단계나 디바이스를 바꿔 저장하면 새 버전이 생깁니다. 옛 실행 기록은 그때 버전에 남습니다', '다음에 고칠 때는 조립 화면에서 바로 고칩니다'],
      표: '이름은 나중에 바꿀 수 있습니다',
    },
  };
  const 지금 = 판들[단계];
  return (
    <aside className="wz-help">
      <div className="wz-art">
        <span className="wz-chips">
          {지금.칩들.map((칩, i) => (
            <span key={칩} className="wz-chips">
              {i === 0 ? null : (
                <span className="wz-arrow" aria-hidden="true">
                  →
                </span>
              )}
              <span className={i === 지금.hot ? 'wz-chip hot' : 'wz-chip'}>{칩}</span>
            </span>
          ))}
        </span>
        <span className="wz-art-label">{t(지금.그림글)}</span>
      </div>
      {지금.줄들.map((줄) => (
        <p key={줄}>{t(줄)}</p>
      ))}
      <span className="wz-badge">{t(지금.표)}</span>
    </aside>
  );
}

/** 왼쪽 세로 단계 띠 — 지나온 단계는 체크, 지금 단계 아래에 안내 칸 */
export function 단계띠({
  목록,
  지금,
  재료,
  on돌아감,
}: {
  목록: 마법사단계[];
  지금: number;
  재료: FlowJob['material'] | null;
  on돌아감: (i: number) => void;
}) {
  const t = use말();
  return (
    <aside className="wz-rail">
      <p className="wz-brand">{t('새 시나리오')}</p>
      <ol className="wz-steps">
        {목록.map((it, i) => (
          <li key={it} className={i < 지금 ? 'done' : i === 지금 ? 'now' : undefined} aria-current={i === 지금 ? 'step' : undefined}>
            {/* 지나온 단계는 눌러 돌아간다. 앞 단계는 차례대로만 간다 — 건너뛰면 넘어가는 조건을 안 거친다 */}
            <button type="button" className="wz-stepbtn" disabled={i >= 지금} onClick={() => on돌아감(i)}>
              <span className="wz-dot">{i < 지금 ? 체크그림 : i + 1}</span>
              {t(단계이름[it])}
            </button>
            {i === 지금 ? <안내칸 단계={it} 재료={재료} /> : null}
          </li>
        ))}
      </ol>
    </aside>
  );
}
