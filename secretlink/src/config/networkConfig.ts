import {createNetworkConfig, NetworkConfig} from "@mysten/dapp-kit";
import { getRpcNodes } from "./rpcNodeList";
import {TESTNET_CHECK_PACKAGE_ID, TESTNET_LINK_STORE_OBJECT_ID} from "./constants";

type Network = "testnet" | "mainnet";
// 定义网络配置类型

// 定义具体的 Variables 类型
interface Variables {
    Package: string;
    StoreObjectId: string;
}

const {networkConfig, useNetworkVariable, useNetworkVariables} =
    createNetworkConfig({
        testnet: {
            url: getRpcNodes("mainnet")[0].url,
            variables: {
                Package: TESTNET_CHECK_PACKAGE_ID,
                StoreObjectId: TESTNET_LINK_STORE_OBJECT_ID,
            }
        },
        mainnet: {
            url: getRpcNodes("mainnet")[0].url,
            variables: {
                Package: TESTNET_CHECK_PACKAGE_ID,
                StoreObjectId: TESTNET_LINK_STORE_OBJECT_ID,
            }
        },
    } as Record<string, NetworkConfig<Variables>>);


// 获取网络变量（合约地址等）
export function getNetworkVariables(network: Network) {
    return networkConfig[network].variables;
}

// 获取默认RPC URL
export function getDefaultRpcUrl(network: Network) {
    return getRpcNodes(network)[0].url;
}


export {useNetworkVariable, useNetworkVariables, networkConfig};
