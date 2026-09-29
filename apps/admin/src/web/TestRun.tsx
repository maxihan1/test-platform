// 실행 설정 화면의 「▶ 테스트 실행」 버튼과 접히는 결과 패널 — 기록에 남기지 않고 한 번 돌려 본다

import { useEffect, useState } from 'react';

import { api, ApiError, type Platform, type TrialResult, type User } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 케이스서비스, 할수있나 } from './role.js';
import { message, seconds, Verdict } from './ui.js';

interface Props {
  tcId: string;
  user: User;
  /** 지금 고른 디바이스. 테스트 실행은 그중 첫째 하나만 돈다 */
  platforms: Platform[];
  /** 화면이 지금 들고 있는 입력값. 실행 만들기와 같은 값이다 */
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
  /** 고른 대상 서버의 주소. 안 골랐으면 null */
  대상주소: string | null;
  /** 서버가 칸별 사유를 주면 화면의 칸 아래에 붙이도록 넘긴다 (RunSetup 의 사유붙이기) */
  on검증실패: (err: ApiError) => void;
}

const 폴링간격 = 1500;

/**
 * 열 주소의 기본값. 대상 서버 주소가 Docker 안 이름(점 없는 호스트, 예 `demo`)이면 브라우저를 여는 쪽은
 * 그 이름을 모르므로 `localhost` 로 바꾼다. 점이 있는 호스트·localhost·IP 는 그대로 둔다.
 */
export function 열주소기본값(주소: string | null): string {
  if (주소 === null) return '';
  return 주소.replace(/^(https?:\/\/)([^/:?#[]+)/i, (전체, 스킴: string, 호스트: string) =>
    호스트.includes('.') || 호스트.toLowerCase() === 'localhost' ? 전체 : `${스킴}localhost`,
  );
}

type 상태 =
  | { 종류: 'none' }
  | { 종류: 'running' }
  | { 종류: 'done'; 결과: TrialResult }
  | { 종류: 'notice'; 글: string };

export function TestRun({ tcId, user, platforms, params, expected, 대상주소, on검증실패 }: Props) {
  const t = use말();
  const 언어 = use언어();
  const [열림, set열림] = useState(false);
  const [적은주소, set적은주소] = useState<string | null>(null);
  const [주소오류, set주소오류] = useState(false);
  const [상태값, set상태] = useState<상태>({ 종류: 'none' });
  const [trialId, setTrialId] = useState<string | null>(null);
  const 주소 = 적은주소 ?? 열주소기본값(대상주소);

  // 화면을 떠나면 멈춘다. 안 멈추면 없는 화면에 상태를 쓰며 서버를 계속 두드린다
  useEffect(() => {
    if (trialId === null) return;
    let 멈춤 = false;
    let 타이머: ReturnType<typeof setTimeout>;
    const 한번 = async () => {
      try {
        const 답 = await api.getTrial(tcId, trialId);
        if (멈춤) return;
        if (답.status === 'DONE') {
          set상태({ 종류: 'done', 결과: 답.result });
          setTrialId(null);
          return;
        }
      } catch (err) {
        if (멈춤) return;
        set상태({ 종류: 'notice', 글: message(err, 언어) });
        setTrialId(null);
        return;
      }
      타이머 = setTimeout(() => void 한번(), 폴링간격);
    };
    타이머 = setTimeout(() => void 한번(), 폴링간격);
    return () => {
      멈춤 = true;
      clearTimeout(타이머);
    };
  }, [trialId]);

  if (!할수있나(user, 케이스서비스(tcId), '실행')) return null;

  const 시작 = async () => {
    set열림(true);
    // 버튼은 죽이지 않는다. 도는 중에 또 누르면 사유를 말한다
    if (상태값.종류 === 'running') {
      set상태({ 종류: 'notice', 글: t('이미 테스트 실행이 돌고 있습니다') });
      return;
    }
    if (platforms.length === 0) {
      set상태({ 종류: 'notice', 글: t('실행할 디바이스를 하나 이상 고르세요.') });
      return;
    }
    const 거절 = !/^https?:\/\/\S/i.test(주소.trim());
    set주소오류(거절);
    if (거절) return;

    set상태({ 종류: 'running' });
    try {
      const { trialId: 새 } = await api.startTrial(tcId, {
        platform: platforms[0]!,
        baseUrl: 주소.trim(),
        params,
        expected,
      });
      setTrialId(새);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'TRIAL_OFF') {
        set상태({ 종류: 'notice', 글: t('이 서버에는 테스트 실행이 켜져 있지 않습니다. 켜는 법은 SETUP') });
      } else if (err instanceof ApiError && err.code === 'TRIAL_BUSY') {
        set상태({ 종류: 'notice', 글: t('이미 테스트 실행이 돌고 있습니다') });
      } else if (err instanceof ApiError && err.violations.length > 0) {
        on검증실패(err);
        set상태({ 종류: 'notice', 글: t('입력값이 명세와 맞지 않습니다.') });
      } else {
        set상태({ 종류: 'notice', 글: message(err, 언어) });
      }
    }
  };

  return (
    <>
      <button type="button" className="btn ghost" onClick={() => void 시작()}>
        {t('▶ 테스트 실행')}
      </button>
      {/* 버튼은 동작줄에 서고 패널은 그 위로 올라간다 — `.trial` 이 한 줄을 다 차지하고 앞에 선다 */}
      <details className="trial" open={열림} onToggle={(e) => set열림(e.currentTarget.open)}>
        <summary>{t('테스트 실행 결과')}</summary>
        <div className="trial-body" role="status">
          <div className="field">
            <label htmlFor={`trial-url-${tcId}`}>{t('열 주소')}</label>
            <div>
              <input
                id={`trial-url-${tcId}`}
                type="text"
                value={주소}
                onChange={(e) => {
                  set적은주소(e.target.value);
                  set주소오류(false);
                }}
              />
              {주소오류 ? <div className="err">{t('열 주소는 http:// 또는 https:// 로 시작해야 합니다')}</div> : null}
            </div>
          </div>
          <p className="hint">{t('실행 기록에 남지 않습니다 · 24시간 뒤 사라집니다')}</p>
          {상태값.종류 === 'running' ? <p>{t('테스트를 실행하는 중입니다')}</p> : null}
          {상태값.종류 === 'notice' ? <p className="err">{상태값.글}</p> : null}
          {상태값.종류 === 'done' ? <결과 결과={상태값.결과} /> : null}
        </div>
      </details>
    </>
  );
}

function 결과({ 결과: r }: { 결과: TrialResult }) {
  const 언어 = use언어();

  return (
    <>
      <div className="trial-head">
        <Verdict status={r.status} />
        <span className="dur">{seconds(r.durationMs, 언어)}</span>
      </div>
      {/* 러너에 못 닿은 사정도 서버가 준 문장을 그대로 낸다. 화면이 지어내면 실제 원인과 어긋난다 */}
      {r.error === undefined ? null : <p className="err">{r.error.message}</p>}
      <ol className="trial-steps">
        {r.steps.map((step) => (
          <li key={step.seq} className={step.status === 'FAIL' ? 'trial-step fail' : 'trial-step'}>
            <Verdict status={step.status} />
            <span>{step.title}</span>
            {step.error === undefined ? null : <span className="err">{step.error.message}</span>}
          </li>
        ))}
      </ol>
    </>
  );
}
