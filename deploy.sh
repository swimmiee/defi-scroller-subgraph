#!/bin/bash

# Initial Values
network=""
protocol=""
env=""

# 모든 인자를 반복하며 처리
for arg in "$@"; do
    case "$arg" in
        network=*) network="${arg#network=}" ;;
        protocol=*) protocol="${arg#protocol=}" ;;
        env=*) env="${arg#env=}" ;;
        *) ;;
    esac
done

# 필수 인자가 입력되지 않은 경우 에러 출력 후 종료
if [[ -z "$network" || -z "$protocol" || -z "$env" ]]; then
    echo "Error: Required arguments missing. Usage: $0 network=<network> protocol=<protocol> env=<local|prod>"
    exit 1
fi

if [[ "$env" != "prod" && "$env" != "local" ]]; then
    echo "Error: Invalid environment specified. Environment must be 'prod' or 'local'."
    exit 1
fi

# env 파일을 통한 graph key 가져오기
if [[ -f ".env.$env" ]]; then
    source ".env.$env"
fi

# 파일의 존재 여부 확인
if [[ ! -f "definitions/$protocol/$protocol.$network.json" ]]; then
    echo "Error: definitions/$protocol/$protocol.$network.json file does not exist."
    exit 1
fi

if [[ ! -f "definitions/$protocol/subgraph.$protocol.yaml" ]]; then
    echo "Error: definitions/$protocol/subgraph.$protocol.yaml file does not exist."
    exit 1
fi


# 명령어 실행
mustache definitions/"$protocol"/"$protocol"."$network".json definitions/"$protocol"/subgraph."$protocol".yaml > subgraph.yaml

graph codegen

if [[ -n "$GRAPH_AUTH_KEY" ]]; then
    graph auth --studio "$GRAPH_AUTH_KEY"
else
    echo "Error: Graph authentication key not found. Please check your .env."$env" file."
    exit 1
fi

# Deploy할 그래프 이름 생성 (최대 30자)
graph_name="test-$protocol-$network"
graph_name="${graph_name:0:30}" # 그래프 이름이 30자를 초과하면 초과하는 부분을 잘라냄

graph deploy --node https://api.studio.thegraph.com/deploy/ --studio "$graph_name"

# Check for error message
if [ $? -eq 0 ]; then
    # last_output=$(history | tail -n 1)
    # if [[ "$last_output" == *"UNCAUGHT EXCEPTION: Error: EEXIT: 1"* ]]; then
    echo "\033[0;33mIf Subgraph does not exist, please create it at: https://thegraph.com/studio/?show=Create\033[0m"
    echo "\033[0;32mPlease create a subgraph named \033[0;92m$graph_name\033[0;32m\033[0m"
    # fi
fi