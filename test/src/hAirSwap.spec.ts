import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, BigNumber, Signer, utils, constants } from "ethers";
import { parseEther, poll } from "ethers/lib/utils";
import {
  createOrder,
  orderToParams,
  createSwapSignature,
} from '@airswap/utils';
import hre, { ethers, network } from "hardhat";
import { Impersonate } from "../utils/utilities";
import abi from "ethereumjs-abi";
import { expect } from "chai";
import { BN } from "bn.js";
import Web3 from "web3";
import { any } from "hardhat/internal/core/params/argumentTypes";
import { Address } from "hardhat-deploy/types";

const { balance, time } = require("@openzeppelin/test-helpers");
const web3 = new Web3();


describe('AirSwap Integration Tests', async () => {

  let snapshotId: any;
  let swapAddress: any;
  let hERC20: Contract;
  let signerToken: any;
  let senderToken: any;
  let staking: Contract;

  let proxyMock: Contract;
  let feeRuleRegistry: Contract;
  let registry: Contract;
  let hMock: Contract;

  let sender: any;
  let signer: any;               //SignerWithAddress;
  let stakingToken: any;
  let owner: any;
  let user1: any;
  let user2: any;
  let protocolFeeWallet: any;

  let hswap: Contract;
  let DAIToken: any;
  let RAIToken: any;
  let USDTToken: any;

  const CHAIN_ID = 31337
  const REBATE_SCALE = '10'
  const REBATE_MAX = '100'
  const PROTOCOL_FEE = '30'
  const PROTOCOL_FEE_LIGHT = '7'
  const DEFAULT_AMOUNT = '10000'


  async function createSignedOrder(params: any, signer: any) {
            
        const unsignedOrder = createOrder({
    
          protocolFee: PROTOCOL_FEE,
          signerWallet: signer.address,
          signerToken: signerToken.address,
          signerAmount: DEFAULT_AMOUNT,
          senderWallet: sender.address,
          senderToken: senderToken.address,
          senderAmount: DEFAULT_AMOUNT,
          ...params,
        })

        return orderToParams({
          ...unsignedOrder,
          ...(await createSwapSignature(
            unsignedOrder,
            signer,
            hswap.address,
            CHAIN_ID
          )),
        })  
      }

  before('get signers and deploy', async () => {
    [sender, signer, protocolFeeWallet] = await ethers.getSigners()

    console.log("1 sender address:", sender.address);
    console.log("2 signer address:", signer.address);
    

    owner = await Impersonate("0x86f6ff8479c69E0cdEa641796b0D3bB1D40761Db");
    user1 = await Impersonate("0x10bf1Dcb5ab7860baB1C3320163C6dddf8DCC0e4");
    user2 = await Impersonate("0xa4b8339D2162125b33A667b0D40aC5dec27E924b");

    hre.tracer.nameTags[owner.address] = "ADMIN";
    hre.tracer.nameTags[user1.address] = "user1";
    hre.tracer.nameTags[user2.address] = "USER2";

    const dai = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    const rai = "0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919";
    const usdt = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
    const AIRSWAP_SWAP = '0x522D6F36c95A1b6509A14272C17747BbB582F2A6';

    // creating contract instance
    signerToken = await ethers.getContractAt("IERC20", dai, owner);
    senderToken = await ethers.getContractAt("IERC20", rai, user2);

    USDTToken = await ethers.getContractAt("IERC20", usdt, user1);
    swapAddress = await ethers.getContractAt("ISwap", AIRSWAP_SWAP, owner);

    // Deploy needy Smart Contracts
    const FeeRuleRegistry = await ethers.getContractFactory("FeeRuleRegistry");
    feeRuleRegistry = await FeeRuleRegistry.deploy(parseEther("0"), signer.address);

    const Registry = await ethers.getContractFactory("Registry");
    registry = await Registry.connect(signer).deploy();

    console.log("3 Registry owner:", await registry.callStatic.owner());

    const HMock = await ethers.getContractFactory("HMock");
    hMock = await HMock.deploy();

    const ProxyMock = await ethers.getContractFactory("ProxyMock");
    proxyMock = await ProxyMock.deploy(registry.address, feeRuleRegistry.address);

    const HSwap = await ethers.getContractFactory('Swap')
    hswap = await HSwap.connect(signer).deploy(
      PROTOCOL_FEE,
      PROTOCOL_FEE_LIGHT,
      protocolFeeWallet.address,
      REBATE_SCALE,
      REBATE_MAX,
      hMock.address
    );

    console.log("4 hswap chainid", await hswap.callStatic.getChainId())
    console.log("5 hswap DOMAIN_CHAIN_ID", await hswap.callStatic.DOMAIN_CHAIN_ID())

    signerToken.connect(owner).transfer(signer.address, parseEther("1000000"));
    senderToken.connect(user2).transfer(sender.address, parseEther("1000000"));

    console.log("6 Check balance of transfer token", await signerToken.balanceOf(signer.address));
    console.log("7 Balance of Rai Token Sender: ", await senderToken.balanceOf(sender.address));

    signerToken.connect(signer).approve(swapAddress.address, parseEther("1000000"));
    senderToken.connect(sender).approve(swapAddress.address, parseEther("1000000"));

    console.log("8 Token Approved");

    // for (let index = 0; index < 10; index++) {

    //   console.log(`Storage At ${index}:`, await signer.provider?.getStorageAt("0x522D6F36c95A1b6509A14272C17747BbB582F2A6", BigNumber.from(index), "latest"));
    // }
  });


    beforeEach(async () => {
      snapshotId = await ethers.provider.send('evm_snapshot', []);
    })

    afterEach(async () => {
      await ethers.provider.send('evm_revert', [snapshotId])
    })



  // Register handler
  it("Registr handlers", async function () {
    await registry.connect(signer).register(hswap.address, ethers.utils.formatBytes32String("HAirSwap"));
    await registry.register(hMock.address, ethers.utils.formatBytes32String("HMock"));

  });


  describe('Test Swap', async () => {

    it('Swap Token', async () => {

      const order = await createSignedOrder({
        recipient: protocolFeeWallet.address,
        nonce: 2,
        expiry: 1668905194 
      }, signer)
      
      // show order
      console.log("9 Order Data",{order});

      await swapAddress.connect(sender).authorize(sender.address);


      const to = hswap.address;
      const data = abi.simpleEncode(
        'swap(address,uint256,uint256,address,address,uint256,address,uint256,uint8,bytes32,bytes32):(uint256[])',
        sender.address,
        ...order
      );

      await swapAddress.authorize(signer.address);


      await senderToken.transfer(proxyMock.address, DEFAULT_AMOUNT);
      console.log("10 Amount transfer to proxy Mock:", await senderToken.balanceOf(proxyMock.address));

      await proxyMock.updateTokenMock(senderToken.address);
      console.log("11 update proxy mock with sender address");

      await expect(await hswap.connect(sender).swap(sender.address, ...order))

      // await proxyMock.connect(signer).execMock(to, data);
      // await proxyMock.execMock(to, data);
      console.log("12 proxy call done");


      


      // Expect full 30 to be taken from signer
      // expect(await signerToken.balanceOf(signer.address)).to.equal('989970')

      // Expect full fee to have been sent to sender
      // expect(await signerToken.balanceOf(sender.address)).to.equal('10000')

      // Expect no fee to have been sent to fee wallet
      // expect(await signerToken.balanceOf(protocolFeeWallet.address)).to.equal('30')
    })

  })
})
