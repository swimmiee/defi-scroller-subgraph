# General Subgraphs Template

Subgraphs for DeFi specific PnL Tracker

## Add subgraphs

1. Add abi(json) files into `abis` folder
2. Write subgraph yaml file at `definitions/{protocol}/{protocol}.subgraph.yaml`.
   - protocol name should be lowercase.
3. Run
   ```bash
   yarn codegen
   ```
4. Write protocol configs for each networks at `definitions/{protocol}/{protocol}.{network}.json`.
   - Find network name on [The graph supported networks](https://thegraph.com/docs/en/developing/supported-networks/)
5. Write subgraph functions at `src/projects/{protocol}/index.js`
   - Two kinds of functions are needed
     1. PositionChange tracker
        - use eventHandlers
        - use savePositionChange at `src/common/savePositionChange.ts`
     2. PositionSnapshot taker
        - use blockHandlers
        - use savePositionSnapshot at `src/common/savePositionSnapshot.ts`

## How to Deploy Subgraphs

```bash
yarn deploy -- network={network} protocol={protocol} env={local|prod}
```

**Example**
Deploying subgraph of SyncSwap on Linea with dev(local) api key

```bash
yarn deploy -- network=linea protocol=syncswap env=local
```

**Supported Networks**
[The graph supported networks](https://thegraph.com/docs/en/developing/supported-networks/)


## Deployed Subgraphs

Uniswap V3
```
https://api.studio.thegraph.com/query/73090/test-uniswap-v3-scroll/v0.1.1
```

SyncSwap
```
https://api.studio.thegraph.com/query/73090/test-syncswap-scroll/v0.1.1
```

Ambient
```
https://api.studio.thegraph.com/query/73090/test-ambient-scroll/v0.1.0
```