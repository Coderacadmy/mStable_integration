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

const musd = 0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9;


describe.only("mStable Integration with FuruCombo", function () {
  let signer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  let hmStaking: Contract;
  let hmUSD: Contract;
  let mUSD: Contract;
  let imUSDVault: Contract;
  let DaiToken: Contract;
  let raiToken: Contract;
  let daiToken: Contract;
  let feeRuleRegistry: Contract;
  let registry: Contract;
  let hMock: Contract;
  let proxyMock: Contract;
  let RaiToken:any;
  let weth:Contract
  

  const dai = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const usdt = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  const usdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const busd = "0x4Fabb145d64652a948d72533023f6E7A623C7C53";
  const rai = "0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919";
  


  before(async () => {
    signer = await Impersonate("0x86f6ff8479c69E0cdEa641796b0D3bB1D40761Db");
    user1 = await Impersonate("0x10bf1Dcb5ab7860baB1C3320163C6dddf8DCC0e4");
    user2 = await Impersonate("0xa4b8339D2162125b33A667b0D40aC5dec27E924b");
    
    hre.tracer.nameTags[signer.address] = "ADMIN";
    hre.tracer.nameTags[user1.address] = "user1";
    hre.tracer.nameTags[user2.address] = "USER2";

    DaiToken = await ethers.getContractAt("IERC20", dai, signer);    
    RaiToken = await ethers.getContractAt("IERC20", rai, signer);
    mUSD = await ethers.getContractAt("IMasset", "0xe2f2a5C287993345a840Db3B0845fbC70f5935a5", signer);

      
    const HmUSD = await ethers.getContractFactory("HmUSD");
    hmUSD = await HmUSD.deploy();

    const HmStaking = await ethers.getContractFactory("HmStaking");
    hmStaking = await HmStaking.deploy(RaiToken.address);

    const FeeRuleRegistry = await ethers.getContractFactory("FeeRuleRegistry");
    feeRuleRegistry = await FeeRuleRegistry.deploy(parseEther("0"), signer.address);

    const Registry = await ethers.getContractFactory("Registry");
    registry = await Registry.deploy();

    const HMock = await ethers.getContractFactory("HMock");
    hMock = await HMock.deploy();

    const ProxyMock = await ethers.getContractFactory("ProxyMock");
    proxyMock = await ProxyMock.deploy(registry.address, feeRuleRegistry.address);

    await DaiToken.approve(mUSD.address, 1000);
    await RaiToken.approve(mUSD.address, 1000);

});

  it("Registr handlers", async function () {
    await registry.register(mUSD.address, ethers.utils.formatBytes32String("mUSD")); 
    await registry.register(hmStaking.address, ethers.utils.formatBytes32String("imUSDVault")); 

  });

  describe('mUSD minting', function() {

    it('DaiTOken mint token into mUSD:',async () => {

      const to = mUSD.address;
      const value = parseEther("5").toHexString();
      await DaiToken.approve(mUSD.address, "100000000");
      const data = abi.simpleEncode(
        'mint(address,uint256,uint256,address):(uint256)',
        DaiToken.address,
        value,
        parseEther("1").toHexString(),
        user1.address
      );
      await DaiToken.transfer(proxyMock.address, value);
      await proxyMock.updateTokenMock(DaiToken.address);
      await proxyMock.execMock(to, data);   
    });
  });
  
  describe('mUSD Swaping', function() {

    it('Swap DaiToken into Rai:',async () => {

        const to = mUSD.address;
        const inputQuantity = parseEther("10").toHexString();
        const minOutputQuantity = parseEther("5").toHexString();
        await DaiToken.approve(mUSD.address, "100000000");

        const data = abi.simpleEncode(
          'swap(address,address,uint256,uint256,address):(uint256)',
          DaiToken.address,
          RaiToken.address,
          inputQuantity,
          minOutputQuantity,
          user1.address
        );
        await DaiToken.transfer(proxyMock.address, inputQuantity);
        await proxyMock.updateTokenMock(DaiToken.address);
        await proxyMock.execMock(to, data);   
      }); 
    });

    describe('mUSD minting', function() {

      it('Stake mUSD tokens:', async function () {
        const to = hmStaking.address;
        const amount = parseEther("10").toHexString();
        await DaiToken.approve(hmStaking.address, "100000000");

        const data = abi.simpleEncode(
          'stake(address,uint256):(address,uint256)',
          RaiToken.address,
          amount
        );
        await DaiToken.transfer(proxyMock.address, amount);
        await proxyMock.updateTokenMock(DaiToken.address);
        await proxyMock.execMock(to, data); 

      })

    });
});