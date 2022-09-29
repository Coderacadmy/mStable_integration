import { Contract } from '@ethersproject/contracts'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { contractNames } from '../ts/deploy';

interface IDeployedContracts {
  [P: string]: Contract;
}

const deployContract: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment,
) {

  const signers = await hre.ethers.getSigners();
  const FeeRuleRegistry = await hre.ethers.getContractFactory("FeeRuleRegistry",signers[1]);
  const feeRuleRegistry = await FeeRuleRegistry.deploy("0", signers[0].address);

  const HAaveProtocolV2 = await hre.ethers.getContractFactory("HAaveProtocolV2",signers[1]);
  const hAave = await HAaveProtocolV2.deploy();

  const Registry = await hre.ethers.getContractFactory("Registry",signers[1]);
  const registry = await Registry.deploy();

  const ProxyMock = await hre.ethers.getContractFactory("ProxyMock",signers[1]);
  const proxyMock = await ProxyMock.deploy(registry.address, feeRuleRegistry.address);


  console.log("haave Address",hAave.address);
  console.log("feeRule Registry Address",feeRuleRegistry.address);
  console.log("Registry Address",registry.address);
  console.log("ProxyMock Address",proxyMock.address);

  try {
    await hre.run('verify', {
      address: feeRuleRegistry.address,
      constructorArgsParams: [],
    })
  } catch (error) {
    console.log(`Smart contract at address ${feeRuleRegistry.address} is already verified`)
  }
  try {
    await hre.run('verify', {
      address: registry.address,
      constructorArgsParams: [],
    })
  } catch (error) {
    console.log(`Smart contract at address ${registry.address} is already verified`)
  }
  try {
    await hre.run('verify', {
      address: hAave.address,
      constructorArgsParams: [],
    })
  } catch (error) {
    console.log(`Smart contract at address ${hAave.address} is already verified`)
  }
  try {
    await hre.run('verify', {
      address: proxyMock.address,
      constructorArgsParams: [],
    })
  } catch (error) {
    console.log(`Smart contract at address ${proxyMock.address} is already verified`)
  }


}

export default deployContract
