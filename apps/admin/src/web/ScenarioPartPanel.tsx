// E2E 시나리오 조립 화면의 「N번 설정」 탭 속 — 케이스 단계의 전제 · 로그인 이어받기 · 준비 · 입력값 · 기대값 (도메인/시나리오 §8.11)

import { useMemo, useState, type ReactNode } from 'react';
import type { ScenarioLink, ScenarioPart } from '@platform/kit';

import { use말 } from './i18n.js';
import type { CasePartMaterial } from './scenarioApi.js';
import { ScenarioFields, 시작글자 } from './ScenarioFields.js';
import { 넘겨받기끄기, 이미실행, 조립값, type 재료들 } from './scenarioView.js';
import { schemaToFields } from './schema.js';
import { Loading } from './ui.js';

type CasePart = Extract<ScenarioPart, { kind: 'case' }>;

interface Props {
  번호: number;
  단계: CasePart;
  단계들: ScenarioPart[];
  재료: 재료들;
  쓰나: boolean;
  on바꿈: (새단계: CasePart) => void;
  on케이스바꾸기: () => void;
  /** 값 연결 편집 칸. 넘기지 않으면 그 자리를 그리지 않는다. 함수면 로그인 이어받기를 끈 동안 기억해 둔 값과 잠금 여부를 받는다 */
  값연결?: ReactNode | ((보일단계: CasePart, 잠금: boolean) => ReactNode);
}

export function ScenarioPartPanel(props: Props) {
  const t = use말();
  const 값 = props.재료.get(props.단계.tcId);
  if (값 === undefined) return <Loading />;
  if (값 === null) {
    return (
      <div className="scn-set">
        <h3 className="scn-set-title">{props.단계.tcId}</h3>
        <p className="scn-set-note">{t('케이스를 찾지 못했습니다')}</p>
        {!props.쓰나 ? null : (
          <>
            <button type="button" className="btn" onClick={props.on케이스바꾸기}>
              {t('케이스 바꾸기')}
            </button>
            <p className="hint">{t('다른 케이스로 바꾸면 이 단계의 준비 · 입력값 설정은 처음부터 다시 합니다')}</p>
          </>
        )}
      </div>
    );
  }
  // 칸 글자는 단계마다 따로 들고 번호나 케이스가 바뀌면 처음부터 다시 시작한다
  return <PanelBody key={`${props.번호}-${props.단계.tcId}`} {...props} 케이스={값} />;
}

function PanelBody({
  번호,
  단계,
  단계들,
  재료,
  쓰나,
  on바꿈,
  케이스,
  값연결,
}: Props & { 케이스: CasePartMaterial }) {
  const t = use말();
  const 잠글까 = !쓰나;
  const 이어받나 = 단계.carryOver !== false;
  // 끌 때 서버가 막는 skipSteps · links 를 초안에서 빼므로, 다시 켤 때 되살리려고 패널이 들고 있다. 패널이 내려가면 사라진다
  const [끄기전, set끄기전] = useState<{ skipSteps: string[]; links: ScenarioLink[] } | null>(null);
  const 보일단계 = 이어받나 || 끄기전 === null ? 단계 : { ...단계, ...끄기전 };
  const 입력칸 = useMemo(() => schemaToFields(케이스.paramSchema), [케이스]);
  const 기대칸 = useMemo(() => schemaToFields(케이스.expectedSchema), [케이스]);
  // 칸을 비우면 키가 빠져 되돌아오는 값이 없다. 글자를 여기서 들고 있어야 쓰는 중인 `1.` 이 안 날아간다
  const [입력글, set입력글] = useState(() => 시작글자(입력칸, 단계.params));
  const [기대글, set기대글] = useState(() => 시작글자(기대칸, 단계.expected));
  const 잠금: Record<string, number> = {};
  for (const l of 단계.links ?? []) if (l.kind === 'bind') 잠금[l.param] = l.value.fromSeq;

  const 아이디 = `scn-set-${번호}`;
  const 건너뛸것 = 케이스.steps.filter((s) => s.skippable);

  function 이어받기바꿈() {
    if (이어받나) {
      set끄기전({ skipSteps: 단계.skipSteps, links: 단계.links ?? [] });
      on바꿈(넘겨받기끄기(단계));
      return;
    }
    on바꿈({ ...단계, carryOver: true, ...끄기전 });
    set끄기전(null);
  }

  function 준비바꿈(제목: string, 실행함: boolean) {
    const 나머지 = 단계.skipSteps.filter((x) => x !== 제목);
    on바꿈({ ...단계, skipSteps: 실행함 ? 나머지 : [...나머지, 제목] });
  }

  function 입력바꿈(key: string, 글: string) {
    const 새글 = { ...입력글, [key]: 글 };
    set입력글(새글);
    on바꿈({ ...단계, params: 조립값(입력칸, 새글) });
  }

  function 기대바꿈(key: string, 글: string) {
    const 새글 = { ...기대글, [key]: 글 };
    set기대글(새글);
    on바꿈({ ...단계, expected: 조립값(기대칸, 새글) });
  }

  return (
    <div className="scn-set">
      <h3 className="scn-set-title">
        {케이스.tcId} {케이스.name}
      </h3>

      {케이스.precondition.length === 0 ? null : (
        <div className="scn-set-block">
          <h4 className="scn-set-sub">{t('전제')}</h4>
          <ul className="scn-set-list">
            {케이스.precondition.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {케이스.unconfirmed === null ? null : (
        <p className="scn-set-note">
          {t('기대값을 화면에서 읽은 케이스입니다. 이 단계가 들어간 실행에는 「미확정 포함」이 붙습니다')}
        </p>
      )}

      <div className="scn-set-block">
        <button
          type="button"
          role="switch"
          aria-checked={이어받나}
          aria-describedby={`${아이디}-carry`}
          className="scn-switch"
          disabled={잠글까}
          onClick={이어받기바꿈}
        >
          <span className="scn-switch-track" aria-hidden="true" />
          {t('로그인 이어받기')}
        </button>
        <p className="hint" id={`${아이디}-carry`}>
          {t('앞 단계의 로그인 상태를 그대로 사용합니다. 끄면 새 창에서 단독으로 실행합니다')}
        </p>
        {이어받나 ? null : (
          <p className="scn-set-note">{t('로그인 이어받기를 끄면 준비 건너뛰기와 값 연결을 쓸 수 없습니다')}</p>
        )}
      </div>

      {!케이스.r16 ? (
        <p className="scn-set-note">{t('이 케이스는 준비가 분리되어 있지 않아 건너뛸 수 없습니다')}</p>
      ) : (
        <fieldset className="scn-set-block scn-set-group">
          <legend>{t('준비 — 체크한 것만 실행')}</legend>
          {건너뛸것.map((s, i) => {
            const 앞번호 = 이미실행(단계들, 재료, 번호, s.title);
            return (
              <label className="scn-check" key={`${i}-${s.title}`}>
                <input
                  type="checkbox"
                  checked={!보일단계.skipSteps.includes(s.title)}
                  disabled={잠글까 || !이어받나}
                  onChange={(e) => 준비바꿈(s.title, e.target.checked)}
                />
                <span>{s.title}</span>
                {앞번호 === null ? null : (
                  <span className="tech-tag">{t('{번호}번에서 이미 실행', { 번호: 앞번호 })}</span>
                )}
              </label>
            );
          })}
        </fieldset>
      )}

      {입력칸.length === 0 ? null : (
        <fieldset className="scn-set-block scn-set-group">
          <legend>{t('입력값')}</legend>
          <ScenarioFields
            idPrefix={`${아이디}-params`}
            fields={입력칸}
            글={입력글}
            잠금={잠금}
            잠글까={잠글까}
            on칸={입력바꿈}
          />
          <p className="hint">{t('비워 둔 칸은 이 케이스에 저장해 둔 값으로 실행합니다')}</p>
        </fieldset>
      )}
      {기대칸.length === 0 ? null : (
        <fieldset className="scn-set-block scn-set-group">
          <legend>{t('기대값')}</legend>
          <ScenarioFields
            idPrefix={`${아이디}-expected`}
            fields={기대칸}
            글={기대글}
            잠금={{}}
            잠글까={잠글까}
            on칸={기대바꿈}
          />
        </fieldset>
      )}

      {값연결 === undefined || (!이어받나 && (끄기전?.links.length ?? 0) === 0) ? null : (
        <div className="scn-set-block">
          <h4 className="scn-set-sub">{t('값 연결')}</h4>
          {typeof 값연결 === 'function' ? 값연결(보일단계, !이어받나) : 값연결}
        </div>
      )}
    </div>
  );
}
