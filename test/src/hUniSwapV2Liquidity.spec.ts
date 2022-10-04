import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BN } from "bn.js";
import { expect } from "chai";
import { Contract, BigNumber, Signer, utils, constants } from "ethers";
import { parseEther, poll } from "ethers/lib/utils";
import hre, { ethers, network } from "hardhat";
import Web3 from "web3";
import { Impersonate } from "../utils/utilities";
import abi from "ethereumjs-abi";

const {balance, time} = require("@openzeppelin/test-helpers");
const web3 = new Web3();

const SUSHISWAP_FACTORY = "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac";
const UNISWAPV2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
let UNISWAPV2_ROUTER02: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
let UNISWAPV2_ETH_DAI: "0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11";
const USDC_TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WETH_TOKEN = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

describe("Uniswap Integration with FuruCombo", function () {
  let signer: SignerWithAddress;
  let user1: SignerWithAddress;
  // let user2: SignerWithAddress;

  let hUniswapV2: Contract;
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
  
  let tokenProvider: any;
  let tokenBProviderAddress: any;
  let uniTokenUserAmount: any;
  let tokenAUserAmount: any;
  let tokenBUserAmount: any;
  let router: any;

  const dai = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const usdt = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  const usdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const hdrn = "0xF2E3A6Ba8955B345a88E5013D9a299c0E83a787e";
  const busd = "0x4Fabb145d64652a948d72533023f6E7A623C7C53";
  const rai = "0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919";
  const bat = "0x7abE0cE388281d2aCF297Cb089caef3819b13448";
  const UniswapDAIRAIPool = "0x4a0Ea6ad985F6526de7d1adE562e1007E9c5d757";
  const AAVEPROTOCOL_V2_PROVIDER = "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5";

  const uniswapV2ETHDAIAddress = UNISWAPV2_ETH_DAI;
  const uniswapV2RouterAddress = UNISWAPV2_ROUTER02;

  before(async () => {
    signer = await Impersonate("0x86f6ff8479c69E0cdEa641796b0D3bB1D40761Db");
    user1 = await Impersonate("0x10bf1Dcb5ab7860baB1C3320163C6dddf8DCC0e4");
    // user2 = await Impersonate("0xa4b8339D2162125b33A667b0D40aC5dec27E924b");
    
    hre.tracer.nameTags[signer.address] = "ADMIN";
    hre.tracer.nameTags[user1.address] = "user";
    // hre.tracer.nameTags[user2.address] = "USER2";
    
    pool = await ethers.getContractAt("IPool", "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9", signer);

    DaiToken = await ethers.getContractAt("IERC20", dai, signer);    
    RaiToken = await ethers.getContractAt("IERC20", rai, signer);
    weth = await ethers.getContractAt("IERC20",WETH_TOKEN,signer);
    uniTokenToken = await ethers.getContractAt("IUniswapV2Pair", UniswapDAIRAIPool, signer);
    router = await ethers.getContractAt("IUniswapV2Router02", "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", signer);
    
    // Token provider 
    tokenProvider = await tokenProviderUniV2(DaiToken.address);
    tokenBProviderAddress = await tokenProviderSushi(RaiToken.address);
      
    const HUniswapV2 = await ethers.getContractFactory("HUniswapV2");
    hUniswapV2 = await HUniswapV2.deploy();

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
    // Register UniswapV2 handler
    const a = await registry.register(hUniswapV2.address, ethers.utils.formatBytes32String("HUniswapV2"));
    // Register Uniswap handler Mock Smart Contract
    await registry.register(hMock.address, ethers.utils.formatBytes32String("HMock"));  
  });

  describe('Swapping', function() {
    
    it('Swap Dai token into WETH:',async () => {

      const slippage = new BN('3');
      const value = parseEther("100").toHexString();
      const to = hUniswapV2.address;
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

      const slippage = new BN('3');
      const value = parseEther("100").toHexString();
      const to = hUniswapV2.address;
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

  describe('Add Liquidity', function() {
    beforeEach(async function() {
      uniTokenUserAmount = await uniTokenToken.callStatic.balanceOf(signer.address);
    });

    it('Add Liquidity into Pool', async function() {
      // Prepare handler data
      const tokenAAmount = parseEther("2").toHexString();
      const tokenBAmount = parseEther("0.683278").toHexString();
      const minTokenAAmount = parseEther("0.1").toHexString();
      const minTokenBAmount = parseEther("0.1").toHexString();
      const to = hUniswapV2.address;
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
      const tx = await proxyMock.execMock(to, data);
      const receipt = await tx.wait()
      // Get handler return result
      const handlerReturn = getHandlerReturn(receipt, [     
        'uint256',
        'uint256',
        'uint256',
      ]);
      const uniTokenUserAmountEnd = await uniTokenToken.callStatic.balanceOf(signer.address);
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
        parseEther("3.5069"),
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
        parseEther("4"),
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
      const to = hUniswapV2.address;
      const data = abi.simpleEncode(
        'removeLiquidity(address,address,uint256,uint256,uint256):(uint256,uint256)',
        DaiToken.address,
        RaiToken.address,
        value,
        parseEther("0.1").toHexString(),
        parseEther("0.1").toHexString(),
      );

      // Execute handler
      const tx = await proxyMock.execMock(to, data);
      const receipt = await tx.wait();

      // Get handler return result
      const handlerReturn = getHandlerReturn(receipt, ['uint256', 'uint256']);
      const tokenAUserAmountEnd = await DaiToken.callStatic.balanceOf(signer.address);
      const tokenBUserAmountEnd = await RaiToken.callStatic.balanceOf(signer.address);
      uniTokenUserAmount = await uniTokenToken.callStatic.balanceOf(signer.address);
    
      // Verify proxy token should be zero
      expect(
        await DaiToken.callStatic.balanceOf(proxyMock.address)
      ).to.be.eq(parseEther('0'));
      expect(
        await RaiToken.callStatic.balanceOf(proxyMock.address)
      ).to.be.eq(parseEther('0'));
      expect(
        await uniTokenToken.callStatic.balanceOf(proxyMock.address)
      ).to.be.eq(parseEther('0'));      
    });
  });
});

// .............................................. Functions for Encode Data .............................................

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

// Swaping
function mulPercent(num: any, percentage: any) {
  return new BN(num).mul(new BN(percentage)).div(new BN(100));
}

async function tokenProviderUniV2(token0 = USDC_TOKEN, token1 = WETH_TOKEN, factoryAddress = UNISWAPV2_FACTORY) {
  if (token0 === WETH_TOKEN) {
    token1 = USDC_TOKEN;
  }
  return _tokenProviderUniLike(token0, token1, factoryAddress);
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