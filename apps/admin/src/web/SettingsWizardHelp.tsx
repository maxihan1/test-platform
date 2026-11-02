// 설정 마법사 왼쪽의 단계 설명과 다 만든 뒤의 끝 화면 — 무엇을 왜 적는지 예를 들어 말한다 (도메인/인증 §8.8 「새로 만들기 마법사」 · 2026-10-23 사용자 「쉬운 말로」)

import type { ReactNode } from 'react';

import { use말 } from './i18n.js';
import { 종류, 종류차례 } from './kind.js';
import { 체크그림, type 단계, type 마법사값 } from './SettingsWizardSteps.js';

interface 판 {
  제목: string;
  그림: ReactNode;
  줄들: string[];
  표: string;
  /** 만든 뒤에는 못 바꾸는 단계 — 표를 다른 모양으로 그린다 */
  잠김?: boolean;
}

/**
 * 지금 단계의 설명 칸. 그림은 글자 칩으로만 그린다 — 실제 화면에서 보게 될 말(종류 이름 · 번호 모양)을 그대로 보여 준다
 * @param 프로젝트 애플리케이션만 더할 때 고른 프로젝트와 그 안의 애플리케이션 이름
 */
export function 단계설명(p: { 단계: 단계; 값: 마법사값; 새프로젝트: boolean; 만든프로젝트: boolean; 프로젝트: { name: string; 앱들: string[] } | null }) {
  const { 단계: st, 값, 새프로젝트, 프로젝트 } = p;
  const t = use말();
  const 칩 = (글: string, 고름 = false) => (
    <span key={글} className={고름 ? 'wz-chip hot' : 'wz-chip'}>
      {글}
    </span>
  );
  const 화살 = <span className="wz-arrow" aria-hidden="true">→</span>;
  const 번호 = 값.prefix === '' ? 'PAY' : 값.prefix;

  const 판들: Record<단계, () => 판> = {
    project: () =>
      새프로젝트
        ? {
            제목: '프로젝트는 제품 하나를 담는 폴더입니다',
            그림: (
              <>
                <span className="wz-art-label">{t('예: 쇼핑몰 프로젝트')}</span>
                <span className="wz-chips">{['쇼핑몰 웹사이트', '쇼핑몰 앱', '관리자 페이지', '주문 알림 API'].map((it) => 칩(t(it)))}</span>
              </>
            ),
            줄들: ['같은 제품의 웹사이트 · 앱 · 관리자 페이지를 한 프로젝트에 모아 둡니다', '누가 볼 수 있는지도 프로젝트마다 정합니다. 한 팀이 맡은 것끼리 묶으면 편합니다', '지금 만드는 계정은 이 프로젝트를 바로 쓸 수 있습니다'],
            표: '이름은 나중에 바꿀 수 있습니다',
          }
        : {
            제목: '애플리케이션은 프로젝트 안에 들어갑니다',
            그림: (
              <>
                <span className="wz-art-label">{프로젝트?.name ?? ''}</span>
                <span className="wz-chips">
                  {(프로젝트?.앱들 ?? []).map((it) => 칩(it))}
                  {칩(t('+ 새 애플리케이션'), true)}
                </span>
              </>
            ),
            줄들: ['고른 프로젝트를 볼 수 있는 사람은 새 애플리케이션도 볼 수 있습니다', '잘못 골랐다면 나중에 프로젝트 설정에서 옮길 수 있습니다'],
            표: '나중에 옮길 수 있습니다',
          },
    kind: () => ({
      제목: '어떤 걸 골라야 할지 모르겠다면',
      그림: (
        <span className="wz-guide">
          {종류차례.map((k) => (
            <span key={k} className={값.kind === k ? 'hot' : undefined}>
              <span>{t(종류(k).소개.고름)}</span>
              <b>{t(종류(k).이름)}</b>
            </span>
          ))}
        </span>
      ),
      줄들: [
        '관리자 페이지(운영툴)도 브라우저로 열면 「웹」입니다',
        '웹과 앱을 둘 다 테스트하려면 애플리케이션을 하나씩 따로 만듭니다',
        '성능 테스트는 어느 종류든 쓸 수 있습니다. 서버 부하는 모두 같고, 웹은 페이지 속도를, 앱 · 게임은 폰 성능을 더 잽니다',
        '종류마다 테스트를 만드는 방식이 달라 처음에 한 번만 정합니다',
      ],
      표: '만든 뒤에는 바꿀 수 없습니다',
      잠김: true,
    }),
    basic: () => ({
      제목: '접두사는 테스트 번호의 앞부분입니다',
      그림: (
        <>
          <span className="wz-art-label">{t('이렇게 번호가 붙습니다')}</span>
          {/* 접두사가 바뀌면 열쇠가 바뀌어 다시 그려진다 — 그때 한 번 커졌다 돌아온다(DESIGN.md 원칙 4 「값이 바뀌면 그 자리만」) */}
          <span className="wz-chips" key={번호}>
            {['001', '002', '003'].map((끝) => (
              <span key={끝} className="wz-tc">
                <span>{번호}</span>-{끝}
              </span>
            ))}
          </span>
        </>
      ),
      줄들: ['결제 서비스는 PAY, 회원 서비스는 MEM 처럼 영문 대문자로 짧게 적습니다', '이름은 메뉴에 보이는 이름이라 언제든 바꿀 수 있습니다', '테스트 폴더는 자동화 스크립트를 모아 둘 폴더입니다'],
      표: '접두사는 나중에 바꿀 수 없습니다',
      잠김: true,
    }),
    envs: () => ({
      제목: '대상 서버는 테스트를 돌릴 곳입니다',
      그림: (
        <>
          <span className="wz-chips">
            {칩(t('개발 서버'))}
            {화살}
            {칩(t('QA 서버'), true)}
            {화살}
            {칩(t('실서비스'))}
          </span>
          <span className="wz-art-label">{t('실행할 때 이 중에서 고릅니다')}</span>
        </>
      ),
      줄들: [
        '보통 개발 · QA 처럼 테스트용 서버 주소를 넣습니다',
        '실제 고객이 쓰는 서버는 「실서비스 서버」에 체크합니다. 테스트를 만들 때 그 서버는 건드리지 않습니다',
        '테스트 계정은 테스트용으로 따로 만든 계정을 넣습니다. 이 프로젝트에서 테스트를 만드는 사람은 모두 볼 수 있는 값으로 생각해 주세요',
        ...(값.kind === 'APP' || 값.kind === 'GAME' ? ['앱 파일 경로에는 설치할 apk 파일 위치를 적습니다. 비워 두면 기본 앱을 씁니다'] : []),
        ...(값.kind === 'GAME' ? ['어드민 키는 테스트가 「골드 1000 지급」처럼 게임 상태를 미리 만들 때 쓰는 열쇠입니다'] : []),
        ...(값.kind === 'API' ? ['API 인증에는 토큰을 받아 오는 방법을 적습니다. 서버마다 같은 이름으로 넣어 두면 서버를 바꿔도 테스트가 그대로 돕니다'] : []),
      ],
      표: '지금 없으면 나중에 넣어도 됩니다',
    }),
    apidoc: () => ({
      제목: 'API 문서로 테스트할 목록을 만듭니다',
      그림: (
        <span className="wz-chips">
          {칩(t('기준 서버 주소'))}
          <span className="wz-arrow" aria-hidden="true">+</span>
          {칩(값.apiDocPath === '' ? '/openapi.json' : 값.apiDocPath, true)}
          {화살}
          {칩(t('API 목록'))}
        </span>
      ),
      줄들: ['보통 /openapi.json 이나 /v3/api-docs 같은 주소입니다. 개발자에게 물어보면 바로 알 수 있습니다', '기준 서버 주소 뒤에 이 경로를 붙여 문서를 받아 옵니다'],
      표: '나중에 바꿀 수 있습니다',
    }),
    extra: () => ({
      제목: '필요한 것만 넣으면 됩니다',
      그림: <span className="wz-chips">{[t('Slack 알림'), t('피그마'), ...(종류(값.kind ?? undefined).대조 ? [t('탐색 제외')] : [])].map((it) => 칩(it))}</span>,
      줄들: [
        'Slack 웹훅을 넣으면 테스트가 끝날 때마다 그 채널로 결과가 옵니다',
        '피그마 토큰을 넣으면 피그마 디자인을 보고 테스트를 만들 수 있습니다',
        ...(종류(값.kind ?? undefined).대조 ? ['탐색 제외 경로에는 자동 탐색이 들어가면 안 되는 주소(예: /logout)를 적습니다'] : []),
      ],
      표: '건너뛰어도 됩니다',
    }),
    confirm: () => ({
      제목: '만들고 나면',
      그림: (
        <span className="wz-chips">
          {칩(t('만들기'))}
          {화살}
          {칩(t('테스트 작성'), true)}
          {화살}
          {칩(t('실행'))}
        </span>
      ),
      줄들: [
        // 앞에서 프로젝트만 만들고 애플리케이션이 실패했으면 이번에는 애플리케이션만 만든다
        새프로젝트
          ? p.만든프로젝트
            ? '프로젝트는 이미 만들었습니다. 애플리케이션만 만듭니다'
            : '프로젝트와 애플리케이션이 함께 만들어집니다'
          : '고른 프로젝트에 애플리케이션이 만들어집니다',
        '다음은 테스트 작성입니다. 기획서나 화면을 넣으면 AI 가 케이스를 만들어 줍니다',
        '접두사와 종류 말고는 나중에 설정에서 언제든 고칠 수 있습니다',
      ],
      표: '「고치기」로 돌아갈 수 있습니다',
    }),
  };
  const 지금 = 판들[st]();
  return (
    <aside className="wz-help">
      <h3>{t(지금.제목)}</h3>
      <div className="wz-art">{지금.그림}</div>
      {지금.줄들.map((it) => (
        <p key={it}>{t(it)}</p>
      ))}
      <span className={지금.잠김 ? 'wz-badge lock' : 'wz-badge'}>{t(지금.표)}</span>
    </aside>
  );
}

/**
 * 다 만든 뒤 — 무엇이 생겼는지와 다음 할 일. 맨 위 고르개에 없는 애플리케이션(나에게 배정 안 된 프로젝트)은 작성으로 바로 못 가서 그 길을 알린다
 * @param 프로젝트이름 이번에 같이 만든 프로젝트. 애플리케이션만 더했으면 null
 * @param 작성갈수 맨 위 고르개에 이미 있다 — 「테스트 작성 시작」을 보인다
 * @param 배정안됨 그 프로젝트가 나에게 배정돼 있지 않다 — 다시 읽어도 고르개에 안 나온다
 */
export function 완료칸(p: { 이름: string; 프로젝트이름: string | null; 작성갈수: boolean; 배정안됨: boolean; on작성: () => void; on설정: () => void }) {
  const t = use말();
  return (
    <div className="wz-done">
      <span className="wz-bigcheck">{체크그림}</span>
      <h2 className="wz-h">{t('{이름} 애플리케이션을 만들었습니다', { 이름: p.이름 })}</h2>
      <p className="wz-sub">
        {p.프로젝트이름 === null ? null : <span>{t('「{프로젝트}」 프로젝트도 함께 만들었습니다', { 프로젝트: p.프로젝트이름 })} </span>}
        {t('이제 테스트를 만들 차례입니다. 기획서나 화면을 넣으면 AI 가 케이스를 만들어 줍니다')}
      </p>
      {/* 맨 위 재료를 다시 읽는 동안에도 고르개에는 아직 없다 — 그때는 안내하지 않고 단추가 뜨기를 기다린다 */}
      {p.배정안됨 ? <p className="hint">{t('맨 위 고르개에서 고르려면 「계정」에서 이 프로젝트를 나에게 배정합니다')}</p> : null}
      <div className="wz-next">
        {p.작성갈수 ? (
          <button type="button" className="btn" onClick={p.on작성}>
            {t('테스트 작성 시작')}
          </button>
        ) : null}
        <button type="button" className={p.작성갈수 ? 'btn ghost' : 'btn'} onClick={p.on설정}>
          {t('설정 열기')}
        </button>
      </div>
    </div>
  );
}
