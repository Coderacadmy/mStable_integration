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

const SUSHISWAP_SUSHI_ETH = '0x795065dcc9f64b5614c407a6efdc400da6221fb0';
const SUSHISWAP_SUSHI_DAI = '0x7ee3Be9a82F051401cA028DB1825AC2640884d0A';
const SUSHISWAP_ROUTER = '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F';
const SUSHISWAP_FACTORY = '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac';
const SUSHI_TOKEN = '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2';
const UniswapDAI_RAI_Pool = "0x4a0Ea6ad985F6526de7d1adE562e1007E9c5d757";
const SushiswapDAI_RAI_Pool = "0xce0f40b7ec7b1aa84070bfd529e88794aaa2fcc9";


const USDC_TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WETH_TOKEN = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const dai = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const rai = "0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919";
const usdt = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const usdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const hdrn = "0xF2E3A6Ba8955B345a88E5013D9a299c0E83a787e";
const busd = "0x4Fabb145d64652a948d72533023f6E7A623C7C53";
const bat = "0x7abE0cE388281d2aCF297Cb089caef3819b13448";

describe.only("SushiSwap Liquidity", function () {
  let signer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  
  let feeRuleRegistry: Contract;
  let hSushiSwap: Contract;
  let proxyMock: Contract;
  let hMock: Contract;
  let pool: Contract;
  let router: Contract;

  let DaiToken: Contract;
  let usdtToken: Contract;
  let raiToken: Contract;
  let daiToken: Contract;
  let registry: Contract;
  let RaiToken: Contract;
  let BatToken: Contract;
  let WethToken:Contract;

  let tokenAProviderAddress: any;
  let tokenBProviderAddress: any;
  let uniTokenUserAmount: any;
  let tokenAUserAmount: any;
  let tokenBUserAmount: any;
  let uniTokenToken: Contract;

  const slippage = new BN('3');

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
    WethToken = await ethers.getContractAt("IERC20",WETH_TOKEN,signer);
    uniTokenToken = await ethers.getContractAt("IUniswapV2Pair", SushiswapDAI_RAI_Pool, signer);
    router = await ethers.getContractAt("IUniswapV2Router02",  SUSHISWAP_ROUTER, signer);
    
    // Token provider 
    tokenAProviderAddress = await tokenProviderSushi(RaiToken.address);
    tokenBProviderAddress = await tokenProviderSushi(DaiToken.address);

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
    // await registry.register(hMock.address, ethers.utils.formatBytes32String("HMock"));  
  });

  describe('Add Liquidity', function() {
    beforeEach(async function() {
      // uniTokenUserAmount = await uniTokenToken.callStatic.balanceOf(signer.address);
    });

    it('Add Liquidity into Pool', async function() {
      // Prepare handler data
      const tokenAAmount = parseEther("10").toHexString();
      const tokenBAmount = parseEther("10").toHexString();
      const minTokenAAmount = parseEther("1").toHexString();
      const minTokenBAmount = parseEther("1").toHexString();
      const to = hSushiSwap.address;
      const data = abi.simpleEncode(
        'addLiquidity(address,address,uint256,uint256,uint256,uint256):(uint256,uint256,uint256)',
        RaiToken.address,
        DaiToken.address,
        tokenAAmount,
        tokenBAmount,
        minTokenAAmount,
        minTokenBAmount
      );
      // Send tokens to proxy
      await RaiToken.transfer(proxyMock.address, tokenAAmount);
      await DaiToken.transfer(proxyMock.address, tokenBAmount);
      // Add tokens to cache for return user after handler execution
      await proxyMock.updateTokenMock(RaiToken.address);
      await proxyMock.updateTokenMock(DaiToken.address);
      // Execute handler
      await proxyMock.execMock(to, data);

    });
  });

  describe('Remove Liquidity', function() {
    beforeEach(async function() {
      // Transfer Token
      await DaiToken.transfer(signer.address, parseEther("100"));
      await RaiToken.transfer(signer.address, parseEther("100"));
      // Approve Token
      await DaiToken.approve(router.address, parseEther("1000"));
      await RaiToken.approve(router.address, parseEther("1000"));

      // Add Liquidity
      await router.addLiquidity(
        DaiToken.address,
        RaiToken.address,
        parseEther("10"),
        parseEther("2.6658"),
        parseEther("1"),
        parseEther("1"),
        signer.address,
        "1667059139",
      );

      // Check user balance of all tokens
      tokenAUserAmount = await DaiToken.callStatic.balanceOf(signer.address);
      tokenBUserAmount = await RaiToken.callStatic.balanceOf(signer.address);
      uniTokenUserAmount = await uniTokenToken.callStatic.balanceOf(signer.address);

    });

    it('Remove Liquidity from pool', async function() {
      
      await uniTokenToken.approve(router.address, uniTokenUserAmount);
      const result = await router.removeLiquidity(
        DaiToken.address,
        RaiToken.address,
        parseEther("1.6658"),
        parseEther("1"),
        parseEther("1"),
        signer.address,
        "1667059139",
      );

      uniTokenUserAmount = await uniTokenToken.callStatic.balanceOf(signer.address);
      // Send uniToken to proxy and prepare handler data
      await uniTokenToken.transfer(proxyMock.address, uniTokenUserAmount);
      await proxyMock.updateTokenMock(uniTokenToken.address);
      
      const value = uniTokenUserAmount.toHexString();
      const to = hSushiSwap.address;
      const data = abi.simpleEncode(
        'removeLiquidity(address,address,uint256,uint256,uint256):(uint256,uint256)',
        DaiToken.address,
        RaiToken.address,
        value,
        parseEther("1").toHexString(),
        parseEther("1").toHexString(),
      );
      // Execute handler
      await proxyMock.execMock(to, data);  
    });
  }); 
});

// ............... Functions for Encode Data ...............//

// Get handler of add and remove liquidity data  
function getHandlerReturn(receipt: any, dataTypes: any) {
  var handlerResult;
  let RecordHandlerResultSig:any;
  receipt.logs.forEach((element: any) => {
    if (element.topics[0] === RecordHandlerResultSig) {
      const bytesData = web3.eth.abi.decodeParameters(
        ['bytes'],
        element.data
      )[0];
      handlerResult = web3.eth.abi.decodeParameters(dataTypes, bytesData);
    }
  });
  return handlerResult;
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