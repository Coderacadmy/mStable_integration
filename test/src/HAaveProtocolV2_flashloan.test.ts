import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, BigNumber, Signer, utils, constants } from "ethers";
import { Bytes, parseEther, poll } from "ethers/lib/utils";
import hre, { ethers, network } from "hardhat";
import Web3 from "web3";
import { Impersonate } from "../utils/utilities";
import abi from "ethereumjs-abi";
import { expect } from "chai";
var util = require("ethereumjs-util");

const web3 = new Web3();
const UNISWAPV2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const USDC_TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WETH_TOKEN = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const dai = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const usdt = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const usdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const hdrn = "0xF2E3A6Ba8955B345a88E5013D9a299c0E83a787e";
const busd = "0x4Fabb145d64652a948d72533023f6E7A623C7C53";
const rai = "0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919";
const bat = "0x7abE0cE388281d2aCF297Cb089caef3819b13448";

describe("Aave Token Flashloan", function () {
  let signer: SignerWithAddress;
  let user: SignerWithAddress;
  let user2: SignerWithAddress;

  let pool: Contract;
  let erc20Token: Contract;
  let hAave: Contract;
  let feeRuleRegistry: Contract;
  let registry: Contract;
  let hMock: Contract;
  let proxyMock: Contract;
  let lendingPoolV2: Contract;
  let faucet: Contract;
  let tokenProvider: any;



  before(async () => {
    signer = await Impersonate("0x06920C9fC643De77B99cB7670A944AD31eaAA260");
    user = await Impersonate("0xa4b8339D2162125b33A667b0D40aC5dec27E924b");

    hre.tracer.nameTags[signer.address] = "ADMIN";

    pool = await ethers.getContractAt("IPool", "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9", signer);

    erc20Token = await ethers.getContractAt("IERC20", WETH_TOKEN, signer);

    tokenProvider = await tokenProviderUniV2(erc20Token.address);

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
    await registry.register(hAave.address, ethers.utils.formatBytes32String("HAaveProtocolV2"));

    // Register Aave handler Mock Smart Contract
    // if not register than give execption invalid handler
    await registry.register(hMock.address, ethers.utils.formatBytes32String("HaaaaaaaMock"));

    // Register Pool Address as a Caller.
    await registry.registerCaller(pool.address, hAave.address.concat("000000000000000000000000"));
  });

  it("Should Revert:Because Bytes Not Zero ", async () => {
    // Transfer Some token to Contract Address from Return amount when we get flashloan
    await erc20Token.connect(tokenProvider).transfer(faucet.address, parseEther("10"));

    // First we Encode Data of SubContract function => Sub
    const params = _getFlashloanParams(
      [hMock.address],
      ["0x3132000000000000000000000000000000000000000000000000000000000000"], // bytes Not Zero != 0x0000000000000000000000000000000000000000000000000000000000000000
      [faucet.address],
      [erc20Token.address],
      [parseEther("10").toHexString()]
    );

    // Now We Again Encode Data passed into Flashloan Encoded Functions as a dataParam == bytes
    const data = _getFlashloanCubeData([erc20Token.address], [parseEther("10").toHexString()], [parseEther("0").toHexString()], params);

    const to = hAave.address;

    // now We Calling a proxy Function that are already using a low level Call in which we Are Calling a flashloan function
    await expect(proxyMock.execMock(to, data, { value: parseEther("1") })).to.be.revertedWith(
      "0_HAaveProtocolV2_flashLoan: Location count less than ref count"
    );
  });

  it("Should Revert: insufficient-balance(User don't have token or balance in his/her account)", async () => {
    // Transfer Some token to Contract Address from Return amount when we get flashloan
    await erc20Token.connect(tokenProvider).transfer(faucet.address, parseEther("10"));

    // First we Encode Data of SubContract function => Sub
    const params = _getFlashloanParams(
      [hMock.address],
      ["0x0000000000000000000000000000000000000000000000000000000000000000"], // bytes Not Zero != 0x0000000000000000000000000000000000000000000000000000000000000000
      [faucet.address],
      [dai],
      [parseEther("10").toHexString()]
    );

    // Now We Again Encode Data passed into Flashloan Encoded Functions as a dataParam == bytes
    const data = _getFlashloanCubeData([dai], [parseEther("10").toHexString()], [parseEther("0").toHexString()], params);

    const to = hAave.address;

    // now We Calling a proxy Function that are already using a low level Call in which we Are Calling a flashloan function
    await expect(proxyMock.execMock(to, data, { value: parseEther("1") })).to.be.revertedWith("0_HAaveProtocolV2_flashLoan: 0_Dai/insufficient-balance");
  });

  it("Should Revert: value not Match", async () => {
    // Transfer Some token to Contract Address from Return amount when we get flashloan
    await erc20Token.connect(tokenProvider).transfer(faucet.address, parseEther("10"));

    // First we Encode Data of SubContract function => Sub
    const params = _getFlashloanParams(
      [hMock.address],
      ["0x0000000000000000000000000000000000000000000000000000000000000000"],
      [faucet.address],
      [erc20Token.address],
      [parseEther("20").toHexString()]
    );

    // Now We Again Encode Data passed into Flashloan Encoded Functions as a dataParam == bytes
    const data = _getFlashloanCubeData([erc20Token.address], [parseEther("10").toHexString()], [parseEther("0").toHexString()], params);

    const to = hAave.address;

    // now We Calling a proxy Function that are already using a low level Call in which we Are Calling a flashloan function
    await expect(proxyMock.execMock(to, data, { value: parseEther("1") })).to.be.revertedWith("0_HAaveProtocolV2_flashLoan: _exec");
  });

  it("Should Revert: token Address not Match ", async () => {
    // Transfer Some token to Contract Address from Return amount when we get flashloan
    await erc20Token.connect(tokenProvider).transfer(faucet.address, parseEther("10"));

    // First we Encode Data of SubContract function => Sub
    const params = _getFlashloanParams(
      [hMock.address],
      ["0x0000000000000000000000000000000000000000000000000000000000000000"],
      [faucet.address],
      [erc20Token.address],
      [parseEther("10").toHexString()]
    );

    // Now We Again Encode Data passed into Flashloan Encoded Functions as a dataParam == bytes
    const data = _getFlashloanCubeData([dai], [parseEther("10").toHexString()], [parseEther("0").toHexString()], params);

    const to = hAave.address;

    // now We Calling a proxy Function that are already using a low level Call in which we Are Calling a flashloan function
    await expect(proxyMock.execMock(to, data, { value: parseEther("1") })).to.be.revertedWith("0_HAaveProtocolV2_flashLoan: _exec");
  });

  it("Should Revert: modes do not match ", async () => {
    // Transfer Some token to Contract Address from Return amount when we get flashloan
    await erc20Token.connect(tokenProvider).transfer(faucet.address, parseEther("10"));

    // First we Encode Data of SubContract function => Sub
    const params = _getFlashloanParams(
      [hMock.address],
      ["0x0000000000000000000000000000000000000000000000000000000000000000"],
      [faucet.address],
      [erc20Token.address],
      [parseEther("10").toHexString()]
    );

    // Now We Again Encode Data passed into Flashloan Encoded Functions as a dataParam == bytes
    const data = _getFlashloanCubeData([dai], [parseEther("10").toHexString()], [1], params);

    const to = hAave.address;

    // now We Calling a proxy Function that are already using a low level Call in which we Are Calling a flashloan function
    await expect(proxyMock.execMock(to, data, { value: parseEther("1") })).to.be.revertedWith("0_HAaveProtocolV2_flashLoan: _exec");
  });

  it("Should Revert: When params have some issue ", async () => {
    // Transfer Some token to Contract Address from Return amount when we get flashloan
    await erc20Token.connect(tokenProvider).transfer(faucet.address, parseEther("10"));

    // First we Encode Data of SubContract function => Sub
    const params = _getFlashloanParams(
      [hMock.address],
      ["0x0000000000000000000000000000000000000000000000000000000000000000"],
      [faucet.address],
      [erc20Token.address],
      [parseEther("10").toHexString()]
    );

    // Now We Again Encode Data passed into Flashloan Encoded Functions as a dataParam == bytes
    const data = _getFlashloanCubeData([erc20Token.address], [parseEther("10").toHexString()], [parseEther("0").toHexString()], "0x0012930193");

    const to = hAave.address;

    // now We Calling a proxy Function that are already using a low level Call in which we Are Calling a flashloan function
    await expect(proxyMock.execMock(to, data, { value: parseEther("1") })).to.be.revertedWith("0_HAaveProtocolV2_flashLoan: _exec");
  });

  it("Should Revert: Transfer Token to wrong address", async () => {
    // Transfer Some token to Contract Address from Return amount when we get flashloan
    await erc20Token.connect(tokenProvider).transfer(proxyMock.address, parseEther("10"));

    // First we Encode Data of SubContract function => Sub
    const params = _getFlashloanParams(
      [hMock.address],
      ["0x0000000000000000000000000000000000000000000000000000000000000000"],
      [faucet.address],
      [erc20Token.address],
      [parseEther("10").toHexString()]
    );

    // Now We Again Encode Data passed into Flashloan Encoded Functions as a dataParam == bytes
    const data = _getFlashloanCubeData([dai], [parseEther("10").toHexString()], [parseEther("0").toHexString()], params);

    const to = hAave.address;

    // now We Calling a proxy Function that are already using a low level Call in which we Are Calling a flashloan function
    await expect(proxyMock.execMock(to, data, { value: parseEther("1") })).to.be.revertedWith("0_HAaveProtocolV2_flashLoan: SafeERC20: low-level call failed");
  });

  it("Flashloan ", async () => {
    // Transfer Some token to Contract Address from Return amount when we get flashloan
    await erc20Token.connect(tokenProvider).transfer(faucet.address, parseEther("10"));

    // First we Encode Data of SubContract function => Sub
    const params = _getFlashloanParams(
      [hMock.address],
      ["0x0000000000000000000000000000000000000000000000000000000000000000"],
      [faucet.address],
      [erc20Token.address],
      [parseEther("10").toHexString()]
    );

    // Now We Again Encode Data passed into Flashloan Encoded Functions as a dataParam == bytes
    const data = _getFlashloanCubeData([erc20Token.address], [parseEther("10").toHexString()], [parseEther("0").toHexString()], params);

    const to = hAave.address;

    // now We Calling a proxy Function that are already using a low level Call in which we Are Calling a flashloan function
    await proxyMock.execMock(to, data, { value: parseEther("1") });
  });
});

// .............................................. Functions for Encode Data .............................................

// Encoding Flashloan Function with Signature and parameters

function _getFlashloanParams(tos: any, configs: any, faucets: any, tokens: any, amounts: any) {
  const data = ["0x" + abi.simpleEncode("drainTokens(address[],address[],uint256[])", faucets, tokens, amounts).toString("hex")];

  const params = web3.eth.abi.encodeParameters(["address[]", "bytes32[]", "bytes[]"], [tos, configs, data]);
  return params;
}

function _getFlashloanCubeData(assets: any, amounts: any, modes: any, params: any) {
  const data = abi.simpleEncode("flashLoan(address[],uint256[],uint256[],bytes)", assets, amounts, modes, util.toBuffer(params));
  return data;
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
