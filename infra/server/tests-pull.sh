#!/bin/sh
# 서비스마다 테스트 저장소를 ./repos/<소유자>/<이름> 로 받아 오고 머리가 바뀐 저장소를 쓰는 서비스만 다시 훑는다 — qahub-pull.sh 가 1분마다 부른다 (docs/SETUP.md §22)
# 받는 것은 각 저장소 main 의 tests/ 와 docs/cases/ 뿐이다. 대상 서비스를 빌드 · 배포하지 않는다 (SPEC 공통/6-인프라 「테스트 코드 저장소」 「받아 오기」)
set -u
cd "$(dirname "$0")/../.."

root=./repos
# Commander 자기 자리 — 받지 않고 compose 가 체크아웃의 tests/ · docs/cases 를 붙인다(apps/admin/src/settings/testsRepo.ts 자기저장소와 같은 값).
# 붙일 자리 폴더가 없으면 읽기 전용 /tests 안에 만들 수 없어 컨테이너가 안 뜬다 — 그래서 늘 먼저 만든다
self=maxihan1/test-platform
mkdir -p "$root/$self/tests" "$root/$self/docs/cases"

# 비공개 저장소용 읽기 전용 열쇠. .env 에서 이 스크립트만 읽는다 — 컨테이너 환경에 싣지 않고 받은 저장소 설정에도 남기지 않는다.
# 요청 머리로만 싣는다(GIT_CONFIG_* 라 명령 줄 인자에도 안 보인다). 비면 공개 저장소만 받는다
token=$(sed -n 's/^TESTS_GITHUB_TOKEN=//p' .env 2>/dev/null | tail -n 1 | tr -d "\"'\r")
if [ -n "$token" ]; then
  GIT_CONFIG_COUNT=1
  GIT_CONFIG_KEY_0=http.https://github.com/.extraheader
  GIT_CONFIG_VALUE_0="AUTHORIZATION: basic $(printf 'x-access-token:%s' "$token" | base64 | tr -d '\n')"
  export GIT_CONFIG_COUNT GIT_CONFIG_KEY_0 GIT_CONFIG_VALUE_0
fi
export GIT_TERMINAL_PROMPT=0
git_() { git -c core.hooksPath=/dev/null -c core.fsmonitor=false "$@"; }

# 받을 저장소는 살아 있는 서비스의 설정 칸이다. 못 읽으면 아무것도 지우지 않고 끝낸다
list=$(docker compose exec -T admin node --import tsx scripts/scan.ts --repos) || { echo "[tests-pull] 저장소 목록을 못 읽었다" >&2; exit 1; }

changed=""
for slug in $list; do
  # 목록은 admin 이 꼴을 맞춘 값이지만 경로로 쓰니 한 번 더 본다
  echo "$slug" | grep -Eq '^[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9._-]+$' || continue
  case "$slug" in "$self" | */. | */..) continue ;; esac
  dir="$root/$slug"
  if [ ! -d "$dir/.git" ]; then
    # 반쯤 받은 폴더를 「자리가 있다」로 읽지 않게 임시 자리에 받아 옮긴다
    rm -rf "$dir.받는중"
    mkdir -p "$(dirname "$dir")"
    if git_ clone -q --depth 1 --sparse --branch main "https://github.com/$slug" "$dir.받는중" &&
      git_ -C "$dir.받는중" sparse-checkout set --no-cone /tests/ /docs/cases/ &&
      mv "$dir.받는중" "$dir"; then :; else
      echo "[tests-pull] $slug 를 받지 못했다 — 비공개면 .env 의 TESTS_GITHUB_TOKEN 을 본다" >&2
      rm -rf "$dir.받는중"
      continue
    fi
  elif ! { git_ -C "$dir" fetch -q --depth 1 origin main && git_ -C "$dir" reset -q --hard FETCH_HEAD; }; then
    echo "[tests-pull] $slug 를 새로 받지 못했다" >&2
    continue
  fi
  # 마지막으로 훑은 커밋과 견준다 — 이번에 받았는지로만 보면 훑기가 실패한 커밋을 다시 안 훑는다
  head=$(git_ -C "$dir" rev-parse HEAD)
  [ "$(cat "$dir/.git/qahub-scanned" 2>/dev/null || true)" = "$head" ] || changed="$changed $slug"
done

# 설정에서 빠진 저장소의 자리는 지운다. Commander 자리는 붙인 자리라 건드리지 않는다
for dir in "$root"/*/*; do
  [ -d "$dir" ] || continue
  slug=${dir#"$root"/}
  [ "$slug" = "$self" ] && continue
  case " $(echo $list) " in *" $slug "*) ;; *) rm -rf "$dir" ;; esac
done

[ -z "$changed" ] && exit 0
# shellcheck disable=SC2086 # 자리는 위에서 꼴을 본 낱말들이다
docker compose exec -T admin node --import tsx scripts/scan.ts $changed || exit 1
for slug in $changed; do
  git_ -C "$root/$slug" rev-parse HEAD > "$root/$slug/.git/qahub-scanned"
done
