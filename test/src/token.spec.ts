import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BN } from "bn.js";
import { expect } from "chai";
import { Contract, BigNumber, Signer, utils, constants } from "ethers";
import { parseEther, poll } from "ethers/lib/utils";
import hre, { ethers, network } from "hardhat";
import Web3 from "web3";
import { Impersonate } from "../utils/utilities";
import abi from "ethereumjs-abi";
import { parse } from "path";
var util = require("ethereumjs-util");

var balance = require("@openzeppelin/test-helpers");
// import {balance} from "@openzeppelin/test-helpers"

let tracker = balance;
let data:any;

const web3 = new Web3();
const UNISWAPV2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

const USDC_TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

const WETH_TOKEN = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

describe("Aave Token", function () {
  let signer: SignerWithAddress;
  let user: SignerWithAddress;
  let user2: SignerWithAddress;

  let pool: Contract;
  let erc20Token: Contract;
  let usdtToken: Contract;
  let raiToken: Contract;
  let flashLoanReceiver: Contract;
  let hAave: Contract;
  let feeRuleRegistry: Contract;
  let registry: Contract;
  let hMock: Contract;
  let proxyMock: Contract;
  let lendingPoolV2: Contract;
  let provider: Contract;
  let lendingPoolAddress: Contract;
  let faucet: Contract;
  let tokenProvider: any;
  let atoken:any;
  let weth:Contract

  const dai = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const usdt = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  const usdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const hdrn = "0xF2E3A6Ba8955B345a88E5013D9a299c0E83a787e";

  const busd = "0x4Fabb145d64652a948d72533023f6E7A623C7C53";
  const rai = "0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919";
  const bat = "0x7abE0cE388281d2aCF297Cb089caef3819b13448";
  const aToken = "0x030ba81f1c18d280636f32af80b9aad02cf0854e";

  const AAVEPROTOCOL_V2_PROVIDER = "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5";

  before(async () => {
    signer = await Impersonate("0x10bf1Dcb5ab7860baB1C3320163C6dddf8DCC0e4");
    user = await Impersonate("0xa4b8339D2162125b33A667b0D40aC5dec27E924b");

    hre.tracer.nameTags[signer.address] = "ADMIN";
    // hre.tracer.nameTags[user.address] = "USER1";
    // hre.tracer.nameTags[user2.address] = "USER2";

    pool = await ethers.getContractAt("IPool", "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9", signer);

    erc20Token = await ethers.getContractAt("IERC20", dai, signer);    
    atoken = await ethers.getContractAt("IERC20", aToken, signer);
    weth = await ethers.getContractAt("IERC20",WETH_TOKEN,signer)


    tokenProvider = await tokenProviderUniV2(erc20Token.address);

    console.log("Provider",tokenProvider.address);
    

    raiToken = await ethers.getContractAt("IERC20", rai, signer);

    const FlashLoanReceiver = await ethers.getContractFactory("FlashLoanReceiver");
    flashLoanReceiver = await FlashLoanReceiver.deploy();

    const HAaveProtocolV2 = await ethers.getContractFactory("HAaveProtocolV2");
    hAave = await HAaveProtocolV2.deploy();

    const FeeRuleRegistry = await ethers.getContractFactory("FeeRuleRegistry");
    feeRuleRegistry = await FeeRuleRegistry.deploy(parseEther("0"), signer.address);

    const Registry = await ethers.getContractFactory("Registry");
    registry = await Registry.deploy();

    const HMock = await ethers.getContractFactory("HMock");
    hMock = await HMock.deploy();

    const ProxyMock = await ethers.getContractFactory("ProxyMock");
    proxyMock = await ProxyMock.deploy(registry.address, feeRuleRegistry.address);

    const Faucet = await ethers.getContractFactory("Faucet");
    faucet = await Faucet.deploy();

    hre.tracer.nameTags[pool.address] = "POOL";
  });

  it("Functions", async function () {
    // Register Aave handler Smart Contract
    await registry.register(hAave.address, ethers.utils.formatBytes32String("AaveProtocolV2"));

    // Register Aave handler Mock Smart Contract
    await registry.register(hMock.address, ethers.utils.formatBytes32String("HaaaaaaaMock"));

   // Register Pool Address as a Caller.
    await registry.registerCaller(pool.address, hAave.address.concat("000000000000000000000000"));
    // await registry.register(pool.address, ethers.utils.formatBytes32String("Pool"));
  });

  it("Calling Nested Smart Contract Using Bytes", async () => {

      // await erc20Token.connect(tokenProvider).approve(proxyMock.address,parseEther("100"))
      // const params = _getSubContParams([subContract.address],["0x0000000000000000000000000000000000000000000000000000000000000000"])

    // Now We Again Encode Data passed into Flashloan Encoded Functions as a dataParam == bytes
    const data = abi.simpleEncode(
      'deposit(address,uint256)',
      erc20Token.address,
      parseEther("100").toHexString());


    // const data = abi.simpleEncode("depositETH(uint256)","0x8ac7230489e80000");


    // const data = _getFlashloanCubeData([erc20Token.address], [parseEther("1")], [parseEther("0")], paramData);

    await erc20Token.connect(tokenProvider).transfer(proxyMock.address,parseEther("100"));
    // await proxyMock.updateTokenMock(erc20Token.address);

    const to = hAave.address;
    // now We Calling a proxy Function that are already using a low level Call in which we Are Calling a flashloan function
    await proxyMock.execMock(to, data, {value: parseEther("10")});

  });

  it("Desposit Ether", async () => {
  const data = abi.simpleEncode("depositETH(uint256)",parseEther("10").toHexString());

  const to = hAave.address;
  // now We Calling a proxy Function that are already using a low level Call in which we Are Calling a flashloan function
  await proxyMock.execMock(to, data, {value: parseEther("10")});

});



it("Withdrw Eth", async () => {
  const data = abi.simpleEncode('withdrawETH(uint256)', parseEther("5").toHexString());


  // await atoken.transfer(proxyMock.address,parseEther("5"))

  const to = hAave.address;

  // await proxyMock.execMock(to, data, {value: parseEther("0.1")});

});

// it("Withdrw Tokken", async () => {
//           const data = abi.simpleEncode(
//           'withdraw(address,uint256)',
//           erc20Token.address,
//           parseEther("20").toHexString()
//         );

//   const to = hAave.address;

//   await proxyMock.execMock(to, data, {value: parseEther("0.1")});

// });


});


// .............................................. Functions for Encode Data .............................................


// Encoding Flashloan Function with Signature and parameters
function _getDepositData(assets: string) {
  const data = abi.simpleEncode("deposit(address,uint256)", assets,"0x056bc75e2d63100000");
  return data;
}


function _getFlashloanCubeData(assets: string[], amounts: any, modes: BigNumber[], params: any) {
  const data = abi.simpleEncode("flashLoan(address[],uint256[],uint256[],bytes)", assets, ["0x0de0b6b3a7640000"], [0], util.toBuffer(params));
  return data;
}

let a: any;
let b: any;

// Encoding add Function with Signature and parameters something like (Delegates or Call)
function _getParams(address: string, a: any, b: any, address2: string, param: string) {
  const data = ["0x" + abi.simpleEncode("add(uint256,uint256,address,bytes)", a, b, address2, param).toString("hex")];
  const configs = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const params = web3.eth.abi.encodeParameters(["address[]", "bytes32[]", "bytes[]"], [[address], [configs], data]);
  return params;
}

// Encoding sub Function with Signature and parameters something like (Delegates or Call)
function _getSubParams(address: any, a: any, b: any,address2:any,params:any) {
  data = abi.simpleEncode("sub(uint256,uint256,address,bytes)", a, b,address2,params);
  return data;
}

function _getaddTwoParams(address: any, a: any, b: any) {
  data = abi.simpleEncode("add(uint256,uint256)", a, b);
  return data;
}

function _getFlashloanParams(tos: any, configs: any, faucets: any, tokens: any, amounts: any) {
  const data = ["0x" + abi.simpleEncode("drainToken(address,address,uint256)", faucets, tokens, "0x0de0b6b3a7640000").toString("hex")];
  const params = web3.eth.abi.encodeParameters(["address[]", "bytes32[]", "bytes[]"], [tos, configs, data]);
  return params;
}



function _getSubContParams(tos: any, configs: any,) {
  const data = ["0x" + abi.simpleEncode("sub(uint256,uint256)", 56, 20).toString("hex")];
  const params = web3.eth.abi.encodeParameters(["address[]", "bytes32[]", "bytes[]"], [tos, configs, data]);
  return params;
}

async function tokenProviderUniV2(token0 = USDC_TOKEN, token1 = WETH_TOKEN, factoryAddress = UNISWAPV2_FACTORY) {
  if (token0 === WETH_TOKEN) {
    token1 = USDC_TOKEN;
  }
  return _tokenProviderUniLike(token0, token1, factoryAddress);
}

async function _tokenProviderUniLike(token0: any, token1: any, factoryAddress: any) {
  const factory = await ethers.getContractAt("IUniswapV2Factory", factoryAddress);
  const pair = await factory.getPair(token0, token1);

  console.log("Pair",pair)
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
