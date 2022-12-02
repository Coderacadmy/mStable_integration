import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, BigNumber, Signer, utils, constants } from "ethers";
import { parseEther, poll } from "ethers/lib/utils";
import hre, { ethers, network } from "hardhat";
import { Impersonate } from "../utils/utilities";
// import { contractOptions } from "web3/eth/contract";
import abi from "ethereumjs-abi";
import { expect } from "chai";
import { BN } from "bn.js";
import Web3 from "web3";

const {balance, time} = require("@openzeppelin/test-helpers");
const web3 = new Web3();

const SUSHISWAP_ROUTER = '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F';
const SUSHISWAP_FACTORY = '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac';

const USDC_TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WETH_TOKEN = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

describe("SushiSwap Swap", function () {
  let signer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  
  let hSushiSwap: Contract;
  let pool: Contract;
  let DaiToken: Contract;
  let usdtToken: Contract;
  let raiToken: Contract;
  let daiToken: Contract;
  let feeRuleRegistry: Contract;
  let registry: Contract;
  let hMock: Contract;
  let proxyMock: Contract;
  let RaiToken:any;
  let BatToken: any;
  let weth:Contract
  let uniTokenToken: Contract;
  
  let tokenAProviderAddress: any;
  let tokenBProviderAddress: any;
  let SushiTokenUserAmount: any;
  let tokenAUserAmount: any;
  let tokenBUserAmount: any;
  let router: any;

  const slippage = new BN('3');

  const dai = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const usdt = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  const usdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const hdrn = "0xF2E3A6Ba8955B345a88E5013D9a299c0E83a787e";
  const busd = "0x4Fabb145d64652a948d72533023f6E7A623C7C53";
  const rai = "0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919";
  const bat = "0x7abE0cE388281d2aCF297Cb089caef3819b13448";

  before(async () => {
    signer = await Impersonate("0x86f6ff8479c69E0cdEa641796b0D3bB1D40761Db");
    user1 = await Impersonate("0x10bf1Dcb5ab7860baB1C3320163C6dddf8DCC0e4");
    user2 = await Impersonate("0xa4b8339D2162125b33A667b0D40aC5dec27E924b");
    
    hre.tracer.nameTags[signer.address] = "ADMIN";
    hre.tracer.nameTags[user1.address] = "user";
    hre.tracer.nameTags[user2.address] = "USER2";
    
    pool = await ethers.getContractAt("IPool", "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9", signer);
    DaiToken = await ethers.getContractAt("IERC20", dai, signer);    
    RaiToken = await ethers.getContractAt("IERC20", rai, signer);
    weth = await ethers.getContractAt("IERC20",WETH_TOKEN,signer);
    router = await ethers.getContractAt("IUniswapV2Router02",  SUSHISWAP_ROUTER, signer);
    
    // Token provider 
    tokenAProviderAddress = await tokenProviderSushi(DaiToken.address);
    tokenBProviderAddress = await tokenProviderSushi(RaiToken.address);

    const HSushiSwap = await ethers.getContractFactory("HSushiSwap");
    hSushiSwap = await HSushiSwap.deploy();

    const FeeRuleRegistry = await ethers.getContractFactory("FeeRuleRegistry");
    feeRuleRegistry = await FeeRuleRegistry.deploy(parseEther("0"), signer.address);

    const Registry = await ethers.getContractFactory("Registry");
    registry = await Registry.deploy();

    const HMock = await ethers.getContractFactory("HMock");
    hMock = await HMock.deploy();

    const ProxyMock = await ethers.getContractFactory("ProxyMock");
    proxyMock = await ProxyMock.deploy(registry.address, feeRuleRegistry.address);

    hre.tracer.nameTags[pool.address] = "POOL";
});

  it("Registr handlers", async function () {
  
    await registry.register(hSushiSwap.address, ethers.utils.formatBytes32String("HSushiSwap"));
    await registry.register(hMock.address, ethers.utils.formatBytes32String("HMock")); 
    // console.log("handler address: ", await registry.callStatic.isValidHandler(hMock.address));

  });

  describe('Swapping', function() {
    it('Swap Dai token into WETH:',async () => {
      const value = parseEther("100").toHexString();
      const to = hSushiSwap.address;
      const path = [DaiToken.address, WETH_TOKEN];
      
      // calculate the amount of transfer
      const result = await router.getAmountsOut(value, path);
      await DaiToken.approve(router.address, value);
      const data = abi.simpleEncode(
        'swapExactTokensForETH(uint256,uint256,address[]):(uint256[])',
        value,
        mulPercent(result, new BN('100').sub(slippage)),
        path
      );
      await DaiToken.transfer(proxyMock.address, value);
      await proxyMock.updateTokenMock(DaiToken.address);
      await proxyMock.execMock(to, data); 
        
    }); 
    
    it('Swap Rai token into WETH:',async () => {  
      const value = parseEther("100").toHexString();
      const to = hSushiSwap.address;
      const path = [RaiToken.address, WETH_TOKEN];
      
      // calculate the amount of transfer
      const result = await router.getAmountsOut(value, path);
      await RaiToken.approve(router.address, value);
      const data = abi.simpleEncode(
        'swapExactTokensForETH(uint256,uint256,address[]):(uint256[])',
        value,
        mulPercent(result, new BN('100').sub(slippage)),
        path
      );
      await RaiToken.transfer(proxyMock.address, value);
      await proxyMock.updateTokenMock(RaiToken.address);
      await proxyMock.execMock(to, data);   
    }); 

  }); 
});

// ............... Functions for Encode Data ...............//

// Swaping
function mulPercent(num: any, percentage: any) {
  return new BN(num).mul(new BN(percentage)).div(new BN(100));
}

async function tokenProviderSushi(
  token0 = USDC_TOKEN,
  token1 = WETH_TOKEN,
  factoryAddress = SUSHISWAP_FACTORY
) {
  if (token0 === WETH_TOKEN) {
    token1 = USDC_TOKEN;
  }
  return _tokenProviderUniLike(token0, token1, factoryAddress);
}

async function _tokenProviderUniLike(token0: any, token1: any, factoryAddress: any) {
  const factory = await ethers.getContractAt("IUniswapV2Factory", factoryAddress);
  const pair = await factory.getPair(token0, token1);
  return impersonateAndInjectEther(pair);
}
async function impersonateAndInjectEther(address: any) {
  // Impersonate pair
  await network.provider.send("hardhat_impersonateAccount", [address]);

  // Inject 1 ether
  await network.provider.send("hardhat_setBalance", [address, "0xde0b6b3a7640000"]);
  const account = await ethers.getSigner(address);
  return account;
}