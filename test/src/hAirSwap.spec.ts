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

const {balance, time} = require("@openzeppelin/test-helpers");
const web3 = new Web3();

const ERC20 = require('@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json')

const AIRSWAP_SWAP = '0x522D6F36c95A1b6509A14272C17747BbB582F2A6';

describe.only('AirSwap Integration Tests', () => {
    
    let snapshotId: any;
    let hswap: Contract;
    let signerToken: any;
    let senderToken: any;
    let staking: Contract; 

    let proxyMock: Contract;
    let feeRuleRegistry: Contract;
    let registry: Contract;
    let hMock: Contract;
  
    let sender: any;
    let signer: any;
    let stakingToken: any;
    let user1: any;
    let user2: any;
    let protocolFeeWallet: any;
  
    const CHAIN_ID = 31337
    const REBATE_SCALE = '10'
    const REBATE_MAX = '100'
    const PROTOCOL_FEE = '30'
    const PROTOCOL_FEE_LIGHT = '7'
    const DEFAULT_AMOUNT = '10'

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
    
    //   beforeEach(async () => {
    //     snapshotId = await ethers.provider.send('evm_snapshot')
    //   })
    
    //   afterEach(async () => {
    //     await ethers.provider.send('evm_revert', [snapshotId])
    //   })

    const dai = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    const rai = "0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919";
    const usdt = "0xdAC17F958D2ee523a2206206994597C13D831ec7";


    before('get signers and deploy', async () => {
        // ;[sender, signer, protocolFeeWallet] = await ethers.getSigners()

        signer = await Impersonate("0x86f6ff8479c69E0cdEa641796b0D3bB1D40761Db");
        user1 = await Impersonate("0x10bf1Dcb5ab7860baB1C3320163C6dddf8DCC0e4");
        user2 = await Impersonate("0xa4b8339D2162125b33A667b0D40aC5dec27E924b");
    
        hre.tracer.nameTags[signer.address] = "ADMIN";
        hre.tracer.nameTags[user1.address] = "user";
        hre.tracer.nameTags[user2.address] = "USER2";
    
        signerToken = await ethers.getContractAt("IERC20", dai, signer);    
        senderToken = await ethers.getContractAt("IERC20", rai, signer);

        hswap = await ethers.getContractAt("ISwap",  AIRSWAP_SWAP, signer);

        stakingToken = await ethers.getContractAt("IERC20", usdt, signer);
        stakingToken.transfer(sender.address, 1000)

    
        // stakingToken = await (
        //   await ethers.getContractFactory(ERC20.abi, ERC20.bytecode)
        // ).deploy('Staking', 'STAKE')
        // await stakingToken.deployed()
        // stakingToken.mint(sender.address, 10000000000)
    
    
        // const Staking = await ethers.getContractFactory("Staking");
        // staking = await Staking.deploy(stakingToken.address, 'Staking', 'STAKING', 100, 100);
    
        console.log("staking address:", staking.address);

        const FeeRuleRegistry = await ethers.getContractFactory("FeeRuleRegistry");
        feeRuleRegistry = await FeeRuleRegistry.deploy(parseEther("0"), signer.address);

        const Registry = await ethers.getContractFactory("Registry");
        registry = await Registry.deploy();

        const HMock = await ethers.getContractFactory("HMock");
        hMock = await HMock.deploy();

        const ProxyMock = await ethers.getContractFactory("ProxyMock");
        proxyMock = await ProxyMock.deploy(registry.address, feeRuleRegistry.address);
        
        
        // signerToken = await (
        //   await ethers.getContractFactory(ERC20.abi, ERC20.bytecode)
        // ).deploy('A', 'A')
        // await signerToken.deployed()
        // signerToken.mint(signer.address, 1000000)
    
        // senderToken = await (
        //   await ethers.getContractFactory(ERC20.abi, ERC20.bytecode)
        // ).deploy('B', 'B')
        // await senderToken.deployed()
        // senderToken.mint(sender.address, 1000000)
    
        console.log("///////////.....................");
    
        const HSwap = await ethers.getContractFactory('Swap')
        hswap = await HSwap.deploy(PROTOCOL_FEE, PROTOCOL_FEE_LIGHT, protocolFeeWallet.address,REBATE_SCALE,REBATE_MAX,staking.address);
    
        // console.log("///////////", swap);
    
        signerToken.connect(signer).approve(hswap.address, 1000)
        senderToken.connect(sender).approve(hswap.address, 1000)
      })

      describe('Test rebates', async () => {
        it('test swap without rebate', async () => {
          // await stakingToken.mock.balanceOf.returns(0)
    
          const order = await createSignedOrder({
            recipient: protocolFeeWallet.address,
            nonce: 2,
            expiry: 1668905194 
          }, signer)
          
          // show order
          console.log({order});


         
          const to = hswap.address;

          const data = abi.simpleEncode(
            'swap(address,uint256,uint256,address,address,uint256,address,uint256,uint8,bytes32,bytes32):(uint256[])',
            sender.address,
            ...order
          );
          await senderToken.transfer(proxyMock.address, DEFAULT_AMOUNT);
          await proxyMock.updateTokenMock(senderToken.address);
          await proxyMock.execMock(to, data);
          
          


    
        //   await expect(
        //     await hswap.connect(sender).swap(sender.address, ...order)
        //   ).to.emit(hswap, 'Swap')
    
          // console.log("sender balance:", senderToken);
    
          // Expect full 30 to be taken from signer
          expect(await signerToken.balanceOf(signer.address)).to.equal('989970')
    
          // Expect full fee to have been sent to sender
          expect(await signerToken.balanceOf(sender.address)).to.equal('10000')
    
          // Expect no fee to have been sent to fee wallet
          expect(await signerToken.balanceOf(protocolFeeWallet.address)).to.equal('30')
        })


    })
})