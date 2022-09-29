import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, BigNumber, Signer, utils, constants } from "ethers";
import { parseEther, poll } from "ethers/lib/utils";
import hre, { ethers, network } from "hardhat";
import { Impersonate } from "../utils/utilities";
import abi from "ethereumjs-abi";
import { expect } from "chai";

const UNISWAPV2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const USDC_TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WETH_TOKEN = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const TUSD_TOKEN = "0x0000000000085d4780B73119b644AE5ecd22b376";
const ATUSD_V2_DEBT_STABLE = "0x7f38d60D94652072b2C44a18c0e14A481EC3C0dd";
const ATUSD_V2_DEBT_VARIABLE = "0x01C0eb1f8c6F1C1bF74ae028697ce7AA2a8b0E92";
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const ADAI_V2 = "0x028171bCA77440897B824Ca71D1c56caC55b68A3";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const HDRN = "0xF2E3A6Ba8955B345a88E5013D9a299c0E83a787e";
const BUSD = "0x4Fabb145d64652a948d72533023f6E7A623C7C53";
const RAI = "0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919";
const BAT = "0x7abE0cE388281d2aCF297Cb089caef3819b13448";
const aToken = "0x030ba81f1c18d280636f32af80b9aad02cf0854e";
const AWETH_V2 = "0x030bA81f1c18d280636F32af80b9AAd02Cf0854e";
const AWETH_V2_DEBT_STABLE = "0x4e977830ba4bd783C0BB7F15d3e243f73FF57121";
const AWETH_V2_DEBT_VARIABLE = "0xF63B34710400CAd3e044cFfDcAb00a0f32E33eCf";

describe("Aave Token Borrow", function () {
  let signer: SignerWithAddress;
  let user: SignerWithAddress;

  let pool: Contract;
  let token: Contract;
  let aweth: Contract;
  let raiToken: Contract;
  let hAave: Contract;
  let feeRuleRegistry: Contract;
  let registry: Contract;
  let proxyMock: Contract;
  let tokenProvider: any;
  let wethTokenProvider: any;
  let atoken: any;
  let weth: Contract;
  let borrowToken: Contract;
  let stabeDebtToken: Contract;
  let variableDebtToken: Contract;

  before(async () => {
    user = await Impersonate("0x1B7BAa734C00298b9429b518D621753Bb0f6efF2");
    signer = await Impersonate("0x10bf1Dcb5ab7860baB1C3320163C6dddf8DCC0e4");

    hre.tracer.nameTags[signer.address] = "ADMIN";

    pool = await ethers.getContractAt("IPool", "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9", signer);

    token = await ethers.getContractAt("IERC20", DAI);
    atoken = await ethers.getContractAt("IERC20", ADAI_V2);
    weth = await ethers.getContractAt("IERC20", WETH_TOKEN);
    aweth = await ethers.getContractAt("IERC20", AWETH_V2);
    borrowToken = await ethers.getContractAt("IERC20", TUSD_TOKEN);
    stabeDebtToken = await ethers.getContractAt("IStableDebtToken", ATUSD_V2_DEBT_STABLE);
    variableDebtToken = await ethers.getContractAt("IVariableDebtToken", ATUSD_V2_DEBT_VARIABLE);

    tokenProvider = await tokenProviderUniV2(token.address);
    wethTokenProvider = await tokenProviderUniV2(weth.address);

    raiToken = await ethers.getContractAt("IERC20", RAI, signer);

    const HAaveProtocolV2 = await ethers.getContractFactory("HAaveProtocolV2");
    hAave = await HAaveProtocolV2.deploy();

    const FeeRuleRegistry = await ethers.getContractFactory("FeeRuleRegistry");
    feeRuleRegistry = await FeeRuleRegistry.deploy(parseEther("0"), signer.address);

    const Registry = await ethers.getContractFactory("Registry");
    registry = await Registry.deploy();

    const ProxyMock = await ethers.getContractFactory("ProxyMock");
    proxyMock = await ProxyMock.deploy(registry.address, feeRuleRegistry.address);

    hre.tracer.nameTags[pool.address] = "POOL";
  });

  it("Register Addresses", async function () {
    // Register Aave handler Smart Contract
    await registry.register(hAave.address, ethers.utils.formatBytes32String("AaveProtocolV2"));

    // Register Pool Address as a Caller.
    await registry.registerCaller(pool.address, hAave.address.concat("000000000000000000000000"));
  });



  it("should revert: borrow token with no collateral", async () => {
    const borrowAmount = parseEther("10").toHexString();
    const data = abi.simpleEncode("borrow(address,uint256,uint256)", borrowToken.address, borrowAmount, 2);
    await variableDebtToken.connect(user).approveDelegation(proxyMock.address, borrowAmount);

    const to = hAave.address;

    await expect(proxyMock.connect(user).execMock(to, data, { value: parseEther("0.5") })).to.be.revertedWith("0_HAaveProtocolV2_borrow: 9");
  });

  it("Deposit Tokens", async () => {
    const data = abi.simpleEncode("deposit(address,uint256)", token.address, parseEther("100").toHexString());

    await token.connect(tokenProvider).transfer(proxyMock.address, parseEther("100"));

    const to = hAave.address;

    await proxyMock.connect(user).execMock(to, data, { value: parseEther("10") });
  });

  it("Desposit Ether", async () => {
    const data = abi.simpleEncode("depositETH(uint256)", parseEther("10").toHexString());

    const to = hAave.address;

    await proxyMock.connect(user).execMock(to, data, { value: parseEther("10") });
  });

  it("Should Revert:borrow token without approveDelegation", async () => {
    const borrowAmount = parseEther("10").toHexString();
    const data = abi.simpleEncode("borrow(address,uint256,uint256)", borrowToken.address, borrowAmount, 1);
    // await stabeDebtToken.connect(user).approveDelegation(proxyMock.address, borrowAmount);

    const to = hAave.address;

    await expect(proxyMock.connect(user).execMock(to, data, { value: parseEther("0.5") })).to.be.revertedWith("0_HAaveProtocolV2_borrow: 59");
  });

  it("Borrow with Stable Rate", async () => {
    const borrowAmount = parseEther("10").toHexString();
    const data = abi.simpleEncode("borrow(address,uint256,uint256)", borrowToken.address, borrowAmount, 1);
    await stabeDebtToken.connect(user).approveDelegation(proxyMock.address, borrowAmount);

    const to = hAave.address;

    await proxyMock.connect(user).execMock(to, data, { value: parseEther("0.5") });
  });


   it("Should Revert:borrow token over the collateral value", async () => {
    const borrowAmount = parseEther("10000").toHexString();
    const data = abi.simpleEncode("borrow(address,uint256,uint256)", borrowToken.address, borrowAmount, 2);
    await variableDebtToken.connect(user).approveDelegation(proxyMock.address, borrowAmount);

    const to = hAave.address;

    await expect(proxyMock.connect(user).execMock(to, data, { value: parseEther("0.5") })).to.be.revertedWith("0_HAaveProtocolV2_borrow: 11");
  });

  it("Should revert: borrow token that is not in aaveV2 pool", async () => {
    const borrowAmount = parseEther("10").toHexString();
    const data = abi.simpleEncode("borrow(address,uint256,uint256)", variableDebtToken.address, borrowAmount, 2);
    await variableDebtToken.connect(user).approveDelegation(proxyMock.address, borrowAmount);

    const to = hAave.address;

    await expect(proxyMock.connect(user).execMock(to, data, { value: parseEther("0.5") })).to.be.revertedWith("0_HAaveProtocolV2_borrow: 2");
  });


  it("should revert: borrow token is the same with collateral", async () => {
    const borrowAmount = parseEther("10").toHexString();
    const data = abi.simpleEncode("borrow(address,uint256,uint256)", token.address, borrowAmount, 2);

    await variableDebtToken.connect(user).approveDelegation(proxyMock.address, borrowAmount);

    const to = hAave.address;

    await expect(proxyMock.connect(user).execMock(to, data, { value: parseEther("0.5") })).to.be.revertedWith("0_HAaveProtocolV2_borrow: 59");
  });


  it("Borrow with variable Rate", async () => {
    const borrowAmount = parseEther("10").toHexString();
    const data = abi.simpleEncode("borrow(address,uint256,uint256)", borrowToken.address, borrowAmount, 2);
    await variableDebtToken.connect(user).approveDelegation(proxyMock.address, borrowAmount);

    const to = hAave.address;

    await proxyMock.connect(user).execMock(to, data, { value: parseEther("0.5") });
  });

});

async function tokenProviderUniV2(token0 = USDC_TOKEN, token1 = WETH_TOKEN, factoryAddress = UNISWAPV2_FACTORY) {
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
