import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, BigNumber, Signer, utils, constants } from "ethers";
import { parseEther, parseUnits, poll } from "ethers/lib/utils";
import hre, { ethers, network } from "hardhat";
import Web3 from "web3";
import { Impersonate } from "../utils/utilities";
import abi from "ethereumjs-abi";
import { expect } from "chai";

const UNISWAPV2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const USDC_TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WETH_TOKEN = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const CDAI = "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643";
const CETHER = "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5";
const COMP_TOKEN = "0xc00e94Cb662C3520282E6f5717214004A7f26888";
const MAKER_PROXY_REGISTRY = "0x4678f0a6958e4d2bc4f1baf7bc52e8f3564f3fe4";

describe("Handler Compound", function () {
  let signer: SignerWithAddress;
  let user: SignerWithAddress;
  let pool: Contract;
  let token: Contract;
  let feeRuleRegistry: Contract;
  let registry: Contract;
  let hSCompound: Contract;
  let tokenProvider: any;
  let ctoken: any;
  let cEther: Contract;
  let comp: Contract;
  let proxyMock: Contract;
  let factory: Contract;
  let dsRegistry: Contract;
  let userProxy: Contract;

  before(async () => {
    signer = await Impersonate("0x10bf1Dcb5ab7860baB1C3320163C6dddf8DCC0e4");
    user = await Impersonate("0x1B7BAa734C00298b9429b518D621753Bb0f6efF2");

    hre.tracer.nameTags[signer.address] = "ADMIN";
    pool = await ethers.getContractAt("IPool", "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9", signer);

    token = await ethers.getContractAt("IERC20", DAI, signer);
    ctoken = await ethers.getContractAt("ICToken", CDAI, signer);
    cEther = await ethers.getContractAt("ICEther", CETHER, signer);
    comp = await ethers.getContractAt("IComptroller", COMP_TOKEN, signer);
    dsRegistry = await ethers.getContractAt("IDSProxyRegistry", MAKER_PROXY_REGISTRY, signer);

    userProxy = await ethers.getContractAt("IDSProxy", await dsRegistry.proxies(signer.address));
    tokenProvider = await tokenProviderUniV2(token.address);
    const FeeRuleRegistry = await ethers.getContractFactory("FeeRuleRegistry", signer);
    feeRuleRegistry = await FeeRuleRegistry.deploy(parseEther("0"), signer.address);

    const Registry = await ethers.getContractFactory("Registry", signer);
    registry = await Registry.deploy();

    const HSCompound = await ethers.getContractFactory("HSCompound", signer);
    hSCompound = await HSCompound.deploy();

    const ProxyMock = await ethers.getContractFactory("ProxyMock", signer);
    proxyMock = await ProxyMock.deploy(registry.address, feeRuleRegistry.address);

    const DSGuardFactory = await ethers.getContractFactory("DSGuardFactory", signer);
    factory = await DSGuardFactory.deploy();

    await factory.connect(signer).newGuard(true, proxyMock.address, userProxy.address);
    const guardAddr = await factory.guards(signer.address);
    await userProxy.connect(signer).setAuthority(guardAddr);

    hre.tracer.nameTags[pool.address] = "POOL";
  });

  it("Register Addresses", async function () {
    // Register  handler Smart Contract
    await registry.register(hSCompound.address, ethers.utils.formatBytes32String("HSCompound"));
  });

  it("Deposit", async () => {
    const amount = parseEther("1000").toHexString();

    await token.connect(tokenProvider).transfer(proxyMock.address, amount);

    const to = hSCompound.address;
    const data = abi.simpleEncode("deposit(address,address,uint256)", userProxy.address, token.address, amount);

    await proxyMock.execMock(to, data, { value: parseEther("0.5") });
  });

  it("Deposit Should Revert: Not owner of the DSProxy", async () => {
    const amount = parseEther("10").toHexString();

    await token.connect(tokenProvider).transfer(proxyMock.address, amount);

    const to = hSCompound.address;
    console.log("User Proxy Address", userProxy.address);
    const data = abi.simpleEncode("deposit(address,address,uint256)", userProxy.address, token.address, amount);

    await expect(proxyMock.connect(user).execMock(to, data, { value: parseEther("0.5") })).to.be.revertedWith("Not owner of the DSProxy");
  });

  it("withdraw Ether", async () => {
    const amount = parseEther("5").toHexString();

    // await token.connect(tokenProvider).transfer(proxyMock.address, amount);

    const to = hSCompound.address;
    const data = abi.simpleEncode("withdraw(address,address,uint256)", userProxy.address, token.address, amount);
    // Transfer token to DSProxy for withdrawal
    await token.connect(tokenProvider).transfer(userProxy.address, amount);

    await proxyMock.execMock(to, data, { value: parseEther("0.5") });
  });

  it("Should Revert:Not owner of the DSProxy", async () => {
    const amount = parseEther("5").toHexString();

    const to = hSCompound.address;
    const data = abi.simpleEncode("withdraw(address,address,uint256)", userProxy.address, token.address, amount);
    // Transfer token to DSProxy for withdrawal
    await token.connect(tokenProvider).transfer(userProxy.address, amount);

    await expect(proxyMock.connect(user).execMock(to, data, { value: parseEther("0.5") })).to.be.revertedWith("Not owner of the DSProxy");
  });

  it("Enter in Market", async function () {
    /*

    An asset that is supplied to the protocol is not usable as collateral initially. 
    In order to inform the protocol that you wish to use an asset as collateral,
    you must “enter the market” for that asset. An account can enter multiple markets at one time

    */
    const tokenToEnter = ctoken.address;
    const to = hSCompound.address;
    const data = abi.simpleEncode("enterMarket(address,address)", userProxy.address, tokenToEnter);

    await proxyMock.execMock(to, data, {
      value: parseEther("0.1"),
    });
  });

  it("Should Revert:Not owner of the DSProxy", async function () {
    const tokenToEnter = ctoken.address;
    const to = hSCompound.address;
    const data = abi.simpleEncode("enterMarket(address,address)", userProxy.address, tokenToEnter);

    await expect(proxyMock.connect(user).execMock(to, data, { value: parseEther("0.1") })).to.be.revertedWith("Not owner of the DSProxy");
  });

  it("Exit in Market", async function () {
    const tokenToEnter = ctoken.address;
    const to = hSCompound.address;
    const data = abi.simpleEncode("exitMarket(address,address)", userProxy.address, tokenToEnter);

    await proxyMock.execMock(to, data, {
      value: parseEther("0.1"),
    });
  });

  it("Borrow ETH", async () => {
    /*
     The maximum amount users can borrow is limited by the collateral factors of the assets they have supplied. 
     For example,if a user supplies 100 DAI as collateral, and the posted collateral factor for DAI is 75%,
     then the user can borrow at most 75 DAI worth of other assets at any given time. 
     Each asset on Compound can have a different collateral factor. Collateral factors for each asset can be fetched using the Comptroller contract. 
     
     */

    const cAmountIn = (30000000 * 10) ^ 8;

    const borrowAmount = (20000000 * 10) ^ 8;

    await cEther.connect(signer).mint({ value: parseEther("1") });

    const amount = await cEther.balanceOf(signer.address);

    const to = hSCompound.address;
    const data = abi.simpleEncode(
      "borrow(address,address,address,uint256,uint256,bool)",
      userProxy.address,
      cEther.address,
      cEther.address,
      cAmountIn,
      borrowAmount,
      true
    );

    await cEther.connect(signer).transfer(proxyMock.address, amount);

    await proxyMock.connect(signer).execMock(to, data, { value: parseEther("0.1") });
  });

  it("Should Revert:Not owner of the DSProxy", async () => {
    /*
     The maximum amount users can borrow is limited by the collateral factors of the assets they have supplied. 
     For example,if a user supplies 100 DAI as collateral, and the posted collateral factor for DAI is 75%,
     then the user can borrow at most 75 DAI worth of other assets at any given time. 
     Each asset on Compound can have a different collateral factor. Collateral factors for each asset can be fetched using the Comptroller contract. 
     */

    const cAmountIn = (30000000 * 10) ^ 8;

    const borrowAmount = parseEther("0.00004").toHexString();

    await cEther.connect(signer).mint({ value: parseEther("1") });

    const amount = await cEther.balanceOf(signer.address);

    const to = hSCompound.address;
    const data = abi.simpleEncode(
      "borrow(address,address,address,uint256,uint256,bool)",
      userProxy.address,
      cEther.address,
      cEther.address,
      cAmountIn,
      borrowAmount,
      true
    );

    await cEther.connect(signer).transfer(proxyMock.address, amount);

    await expect(proxyMock.connect(user).execMock(to, data, { value: parseEther("0.1") })).to.revertedWith("Not owner of the DSProxy");
  });

  it("Borrow Token", async () => {
    /*
     The maximum amount users can borrow is limited by the collateral factors of the assets they have supplied. 
     For example,if a user supplies 100 DAI as collateral, and the posted collateral factor for DAI is 75%,
     then the user can borrow at most 75 DAI worth of other assets at any given time. 
     Each asset on Compound can have a different collateral factor. Collateral factors for each asset can be fetched using the Comptroller contract. 
     
     */
    const cAmountIn = (30000000 * 10) ^ 8;

    const borrowAmount = parseEther("60").toHexString();

    await cEther.connect(signer).mint({ value: parseEther("1") });

    const to = hSCompound.address;
    const data = abi.simpleEncode(
      "borrow(address,address,address,uint256,uint256,bool)",
      userProxy.address,
      cEther.address,
      ctoken.address,
      cAmountIn,
      borrowAmount,
      true
    );

    await cEther.connect(signer).transfer(proxyMock.address, cAmountIn);

    await proxyMock.connect(signer).execMock(to, data, { value: parseEther("0.1") });
  });

  it("Should Revert Borrow Token:Not owner of the DSProxy", async () => {
    /*
     The maximum amount users can borrow is limited by the collateral factors of the assets they have supplied. 
     For example,if a user supplies 100 DAI as collateral, and the posted collateral factor for DAI is 75%,
     then the user can borrow at most 75 DAI worth of other assets at any given time. 
     Each asset on Compound can have a different collateral factor. Collateral factors for each asset can be fetched using the Comptroller contract. 
     */

    const cAmountIn = (30000000 * 10) ^ 8;
    const borrowAmount = parseEther("60").toHexString();
    await cEther.connect(signer).mint({ value: parseEther("1") });
    const to = hSCompound.address;
    const data = abi.simpleEncode(
      "borrow(address,address,address,uint256,uint256,bool)",
      userProxy.address,
      cEther.address,
      ctoken.address,
      cAmountIn,
      borrowAmount,
      true
    );

    await cEther.connect(signer).transfer(proxyMock.address, cAmountIn);

    await expect(proxyMock.connect(user).execMock(to, data, { value: parseEther("0.1") })).to.revertedWith("Not owner of the DSProxy");
  });

  it.skip("repay Eth", async function () {
    const repayAmount = (19000000 * 10) ^ 8; // token
    const cWithdrawAmount = (30000000 * 10) ^ 8; // cEther
    const to = hSCompound.address;
    const data = abi.simpleEncode(
      "repayBorrow(address,address,address,uint256,uint256)",
      userProxy.address,
      cEther.address,
      cEther.address,
      repayAmount,
      cWithdrawAmount
    );

    await proxyMock.execMock(to, data, {
      value: parseEther("0.1"),
    });
  });

  it("repay Should Revert: Because of wrong parameter pass or wrong token pass for repay", async function () {
    const repayAmount = parseEther("20").toHexString(); // token
    const cWithdrawAmount = (10000000 * 10) ^ 8; // cEther
    const to = hSCompound.address;
    const data = abi.simpleEncode(
      "repayBorrow(address,address,address,uint256,uint256)",
      userProxy.address,
      cEther.address,
      ctoken.address,
      repayAmount,
      cWithdrawAmount
    );
    await token.connect(tokenProvider).transfer(proxyMock.address, repayAmount);

    await expect(proxyMock.execMock(to, data, { value: parseEther("0.1") })).to.be.revertedWith("0_HSCompound_repayBorrow: Unspecified");
  });

  it.skip("repay whole", async function () {
    const repayAmount = parseEther("20").toHexString(); // token
    const cWithdrawAmount = (10000000 * 10) ^ 8; // cEther
    const to = hSCompound.address;
    const data = abi.simpleEncode(
      "repayBorrow(address,address,address,uint256,uint256)",
      userProxy.address,
      ctoken.address,
      cEther.address,
      repayAmount,
      cWithdrawAmount
    );
    await token.connect(tokenProvider).transfer(proxyMock.address, repayAmount);

    await proxyMock.execMock(to, data, {
      value: parseEther("0.1"),
    });
  });

  it("only input (repay but not withdraw)", async function () {
    const repayAmount = parseEther("20").toHexString(); // token
    const cWithdrawAmount = 0; // cEther
    const to = hSCompound.address;
    const data = abi.simpleEncode(
      "repayBorrow(address,address,address,uint256,uint256)",
      userProxy.address,
      ctoken.address,
      cEther.address,
      repayAmount,
      cWithdrawAmount
    );
    await token.connect(tokenProvider).transfer(proxyMock.address, repayAmount);

    await proxyMock.execMock(to, data, {
      value: parseEther("0.1"),
    });
  });

  it("Should Revert: Withdraw Amount To High", async function () {
    const repayAmount = parseEther("70").toHexString(); // token
    const cWithdrawAmount = (80000000 * 10) ^ 8; // cEther
    const to = hSCompound.address;
    const data = abi.simpleEncode(
      "repayBorrow(address,address,address,uint256,uint256)",
      userProxy.address,
      ctoken.address,
      cEther.address,
      repayAmount,
      cWithdrawAmount
    );
    await token.connect(tokenProvider).transfer(proxyMock.address, repayAmount);

    await expect(proxyMock.execMock(to, data, { value: parseEther("0.1") })).to.be.revertedWith("0_HSCompound__withdraw: Unspecified");
  });

  it("repay Should Revert:Not owner of the DSProxy", async function () {
    const repayAmount = parseEther("70").toHexString(); // token
    const cWithdrawAmount = (30000000 * 10) ^ 8; // cEther
    const to = hSCompound.address;
    const data = abi.simpleEncode(
      "repayBorrow(address,address,address,uint256,uint256)",
      userProxy.address,
      ctoken.address,
      cEther.address,
      repayAmount,
      cWithdrawAmount
    );
    await token.connect(tokenProvider).transfer(proxyMock.address, repayAmount);
    await expect(proxyMock.connect(user).execMock(to, data, { value: parseEther("0.1") })).to.be.revertedWith("Not owner of the DSProxy");
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
