#!/bin/sh
# 맥 작성 에이전트가 병합한 케이스를 서버로 받아 오고 목록을 다시 훑는다 — qahub-pull.timer 가 1분마다 부른다 (docs/SETUP.md §20 · §22)
# Commander 체크아웃(TODO · DEMO 와 플랫폼 코드)을 받은 뒤 서비스마다의 테스트 저장소를 받는다(tests-pull.sh)
set -eu
cd "$(dirname "$0")/../.."

# 훅 · fsmonitor 를 끈다 — 맥 author 의 병합 뒤 당기기와 같은 까닭(scripts/authoring-merge.ts 당김인자)
git -c core.hooksPath=/dev/null -c core.fsmonitor=false pull -q --ff-only origin main

# 테스트 저장소는 Commander 와 따로 돈다 — 받다 막혀도 아래 Commander 자리 훑기는 한다
sh infra/server/tests-pull.sh || echo "[qahub-pull] 테스트 저장소 받아 오기가 실패했다 — 다음 차례에 다시 받는다" >&2

# 마지막으로 훑은 커밋과 견준다 — 이번에 받았는지로만 보면 훑기가 실패한 커밋이나 손으로 받은 커밋을 다시 안 훑는다
head=$(git rev-parse HEAD)
seen=$(git rev-parse --git-path qahub-scanned)
[ "$(cat "$seen" 2>/dev/null || true)" = "$head" ] && exit 0

# admin 은 병합 소식을 받자마자 옛 파일로 훑는다. 그 훑기가 늦게 끝나면 새 케이스를 비활성으로 덮으므로 끝날 때까지 기다린 뒤 훑는다.
# ponytail: 고정 60초 — 한 서비스 훑기가 1분을 넘기면 그때는 덮인다(화면의 「다시 스캔」으로 되돌린다). 잦아지면 서비스마다 훑기에 DB 잠금을 건다
sleep 60
# 체크아웃이 붙은 자리는 Commander 자기 자리뿐이다 — 그 자리를 쓰는 서비스만 훑는다
docker compose exec -T admin node --import tsx scripts/scan.ts maxihan1/test-platform
echo "$head" > "$seen"
