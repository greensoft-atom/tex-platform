#!/usr/bin/env bash
# Builds the draft implementation and checks it on Node.js 12.4.0 + MongoDB 4.4 / 5.0 in throwaway Docker containers.
# Requires only Docker. Containers use a private network, publish no ports and are removed on exit.
set -euo pipefail
cd "$(dirname "$0")"

NODE_RUNTIME_IMAGE="${NODE_RUNTIME_IMAGE:-node:12.4.0}"        # the target server runtime
NODE_BUILD_IMAGE="${NODE_BUILD_IMAGE:-node:22.11.0-alpine}"   # build machine (TypeScript compiler)
MONGO_VERSIONS="${MONGO_VERSIONS:-4.4 5.0}"
MEILI_IMAGE="${MEILI_IMAGE:-getmeili/meilisearch:v1.11.3}"
NET=texdraft-net

cleanup() {
  docker rm -f texdraft-mongo texdraft-meili >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup
docker network create "$NET" >/dev/null

start_mongo() {   # $1 = MongoDB version; starts a single-node replica set (transactions need a replica set)
  local shell=mongo; [[ "$1" != 4.* ]] && shell=mongosh
  docker run -d --name texdraft-mongo --network "$NET" "mongo:$1" --replSet rs0 --bind_ip_all >/dev/null
  for _ in $(seq 1 60); do docker exec texdraft-mongo $shell --quiet --eval "db.adminCommand('ping').ok" >/dev/null 2>&1 && break; sleep 1; done
  docker exec texdraft-mongo $shell --quiet --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'texdraft-mongo:27017'}]})" >/dev/null
  for _ in $(seq 1 60); do docker exec texdraft-mongo $shell --quiet --eval "rs.isMaster().ismaster" 2>/dev/null | grep -q true && break; sleep 1; done
}
run_node() {      # runs a command with the target runtime inside the private network
  docker run --rm --network "$NET" -v "$PWD":/work -w /work \
    -e MONGO_URL="mongodb://texdraft-mongo:27017/tex?replicaSet=rs0&w=majority" \
    -e MEILI_URL="http://texdraft-meili:7700" \
    "$NODE_RUNTIME_IMAGE" "$@"
}

echo "== 1/5 Install dependencies with $NODE_RUNTIME_IMAGE (npm 6)"
run_node npm install --no-audit --no-fund --loglevel=error

echo "== 2/5 Compile TypeScript to ES2019 / CommonJS on $NODE_BUILD_IMAGE"
docker run --rm -v "$PWD":/work -w /work "$NODE_BUILD_IMAGE" node node_modules/typescript/bin/tsc -p tsconfig.json

echo "== 3/5 Runtime smoke test of every pinned dependency, plus full ICU for Chinese locale data"
run_node node tests/smoke.js
docker run --rm -v "$PWD":/work -w /work -e NODE_ICU_DATA=/work/node_modules/full-icu "$NODE_RUNTIME_IMAGE" node tests/test-icu.js

for v in $MONGO_VERSIONS; do
  echo "== 4/5 Release steps, Mongoose models, transactions and policy on MongoDB $v"
  start_mongo "$v"
  run_node node_modules/.bin/migrate-mongo up             # validators + roles (release step, as tex_migrator)
  run_node node_modules/.bin/migrate-mongo status
  run_node node dist/scripts/sync-indexes.js              # indexes declared in the Mongoose schemas
  run_node node dist/scripts/sync-indexes.js --check      # prints nothing when schemas and database agree
  run_node node tests/test-mongo.js
  run_node node tests/test-documents.js
  run_node node tests/test-policy.js
  docker rm -f texdraft-mongo >/dev/null
done

echo "== 5/5 Chinese search: MongoDB text index vs Meilisearch"
start_mongo 4.4
docker run -d --name texdraft-meili --network "$NET" \
  -e MEILI_MASTER_KEY=test-master-key-123456 -e MEILI_ENV=development "$MEILI_IMAGE" >/dev/null
sleep 3
run_node node tests/test-search.js
echo "All checks finished."
