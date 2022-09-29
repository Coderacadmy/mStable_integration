// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import "contracts/interfaces/IFlashLoanReceiver.sol";
import "contracts/interfaces/IERC20.sol";
import "hardhat/console.sol";

contract FlashLoanReceiver is IFlashLoanReceiver {
  function executeOperation(
    address[] calldata assets,
    uint256[] calldata amounts,
    uint256[] calldata premiums,
    address,
    bytes calldata
  ) external override returns (bool) {
    //
    // This contract now has the funds requested.
    // Your logic goes here.
    //

    // At the end of your logic above, this contract owes
    // the flashloaned amounts + premiums.
    // Therefore ensure your contract has enough to repay
    // these amounts.

    // Approve the LendingPool contract allowance to *pull* the owed amount
    for (uint256 i = 0; i < assets.length; i++) {
      uint amountOwing = amounts[i]+ (premiums[i]);
      IERC20(assets[i]).approve(0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9,amountOwing);
    }

    return true;
  }

  //   function executeOperation(
  //     address[] memory assets,
  //     uint256[] memory amounts,
  //     uint256[] memory premiums,
  //     address, // initiator
  //     bytes memory // params
  //   ) public override returns (bool) {

  //     console.log("RAI balance: ",IERC20(assets[0]).balanceOf(address(this)));
  //     IERC20(assets[0]).approve(0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9, amounts[0]+premiums[0]);
  //     return true;
  //   }

  function ADDRESSES_PROVIDER() external view override returns (IPoolAddressesProvider) {}

  function POOL() external view override returns (IPool) {}
}
