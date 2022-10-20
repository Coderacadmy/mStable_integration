// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface ISwap {
  // struct Order {
  //   uint256 nonce;
  //   uint256 expiry;
  //   address signerWallet;
  //   address signerToken;
  //   uint256 signerAmount;
  //   address senderWallet;
  //   address senderToken;
  //   uint256 senderAmount;
  //   uint8 v;
  //   bytes32 r;
  //   bytes32 s;
  // }

  // event Swap(
  //   uint256 indexed nonce,
  //   uint256 timestamp,
  //   address indexed signerWallet,
  //   address signerToken,
  //   uint256 signerAmount,
  //   uint256 protocolFee,
  //   address indexed senderWallet,
  //   address senderToken,
  //   uint256 senderAmount
  // );

  // event SetProtocolFee(uint256 protocolFee);

  // event Authorize(address indexed signer, address indexed signerWallet);

  // event SetProtocolFeeLight(uint256 protocolFeeLight);

  // event SetProtocolFeeWallet(address indexed feeWallet);

  // event SetRebateScale(uint256 rebateScale);

  // event SetRebateMax(uint256 rebateMax);

  // event SetStaking(address indexed staking);

  function swap(
    address recipient,
    uint256 nonce,
    uint256 expiry,
    address signerWallet,
    address signerToken,
    uint256 signerAmount,
    address senderToken,
    uint256 senderAmount,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external;

//   function swapAnySender(
//     address recipient,
//     uint256 nonce,
//     uint256 expiry,
//     address signerWallet,
//     address signerToken,
//     uint256 signerAmount,
//     address senderToken,
//     uint256 senderAmount,
//     uint8 v,
//     bytes32 r,
//     bytes32 s
//   ) external;

//   function swapLight(
//     uint256 nonce,
//     uint256 expiry,
//     address signerWallet,
//     address signerToken,
//     uint256 signerAmount,
//     address senderToken,
//     uint256 senderAmount,
//     uint8 v,
//     bytes32 r,
//     bytes32 s
//   ) external;
}