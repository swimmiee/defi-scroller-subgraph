#!/bin/bash

# Initial Values
network=""
protocol=""

# 모든 인자를 반복하며 처리
for arg in "$@"; do
    case "$arg" in
        network=*) network="${arg#network=}" ;;
        protocol=*) protocol="${arg#protocol=}" ;;
        *) ;;
    esac
done

# 필수 인자가 입력되지 않은 경우 에러 출력 후 종료
if [[ -z "$network" || -z "$protocol" ]]; then
    echo "Error: Required arguments missing. Usage: $0 network=<network> protocol=<protocol>"
    exit 1
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

mustache definitions/"$protocol"/"$protocol"."$network".json definitions/"$protocol"/subgraph."$protocol".yaml > subgraph.yaml

graph codegen