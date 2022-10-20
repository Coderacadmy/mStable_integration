// SPDX-License-Identifier: MIT

/* solhint-disable var-name-mixedcase */
pragma solidity ^0.8.0;

import "../HandlerBase.sol";
import "contracts/interfaces/IERC20.sol";

// import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./ISwap.sol";

/**
 * @title AirSwap: Atomic Token Swap
 * @notice https://www.airswap.io/
 */
contract HAirswap is HandlerBase {
  // using SafeERC20 for IERC20;

  address public constant AIRSWAP_SWAP = 0x522D6F36c95A1b6509A14272C17747BbB582F2A6;

  function getContractName() public pure override returns (string memory) {
        return "HAirswap";
    }

  // bytes32 public constant DOMAIN_TYPEHASH =
  //   keccak256(
  //     "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
  //   );

  // bytes32 public constant ORDER_TYPEHASH =
  //   keccak256(
  //     "Order(uint256 nonce,uint256 expiry,address signerWallet,address signerToken,uint256 signerAmount,uint256 protocolFee,address senderWallet,address senderToken,uint256 senderAmount)"
  //   );

  // bytes32 public constant DOMAIN_NAME = keccak256("SWAP");
  // bytes32 public constant DOMAIN_VERSION = keccak256("3");
  // uint256 public immutable DOMAIN_CHAIN_ID;
  // bytes32 public immutable DOMAIN_SEPARATOR;

  // uint256 internal constant MAX_PERCENTAGE = 100;
  // uint256 internal constant MAX_SCALE = 77;
  // uint256 internal constant MAX_ERROR_COUNT = 6;
  // uint256 public constant FEE_DIVISOR = 10000;

  // mapping(address => mapping(uint256 => uint256)) internal _nonceGroups;

  // mapping(address => address) public authorized;
  
  // uint256 public protocolFee;
  // uint256 public protocolFeeLight;
  // address public protocolFeeWallet;
  // uint256 public rebateScale;
  // uint256 public rebateMax;
  // address public staking;

  constructor(){}

  // /**
  //  * @notice Atomic ERC20 Swap
  //  * @param recipient address Wallet to receive sender proceeds
  //  * @param nonce uint256 Unique and should be sequential
  //  * @param expiry uint256 Expiry in seconds since 1 January 1970
  //  * @param signerWallet address Wallet of the signer
  //  * @param signerToken address ERC20 token transferred from the signer
  //  * @param signerAmount uint256 Amount transferred from the signer
  //  * @param senderToken address ERC20 token transferred from the sender
  //  * @param senderAmount uint256 Amount transferred from the sender
  //  * @param v uint8 "v" value of the ECDSA signature
  //  * @param r bytes32 "r" value of the ECDSA signature
  //  * @param s bytes32 "s" value of the ECDSA signature
  //  */
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
  ) external payable {

    // Get uniswapV2 router
    ISwap swap = ISwap(AIRSWAP_SWAP);

    // // Ensure the order is valid
    // _checkValidOrder(
    //   nonce,
    //   expiry,
    //   signerWallet,
    //   signerToken,
    //   signerAmount,
    //   msg.sender,
    //   senderToken,
    //   senderAmount,
    //   v,
    //   r,
    //   s
    // );

    try
       swap.swap(
          recipient,
          nonce,
          expiry,
          signerWallet,
          signerToken,
          signerAmount,
          senderToken,
          senderAmount,
          v,
          r,
          s
       )  {
            // amount = amounts[amounts.length - 1];
        } catch Error(string memory reason) {
            _revertMsg("swapExactETHForTokens", reason);
        } catch {
            _revertMsg("swapExactETHForTokens");
        }

        _updateToken(signerToken); 
  }

    // // Transfer token from sender to signer
    // IERC20(senderToken).transferFrom(
    //   msg.sender,
    //   signerWallet,
    //   senderAmount
    // );

    // // Transfer token from signer to recipient
    // IERC20(signerToken).transferFrom(signerWallet, recipient, signerAmount);

  // }

  /**
   * @notice Authorize a signer
   * @param signer address Wallet of the signer to authorize
   * @dev Emits an Authorize event
   */
  // function authorize(address signer) external {
  //   require(signer != address(0), "SIGNER_INVALID");
  //   authorized[msg.sender] = signer;
  //   // emit Authorize(signer, msg.sender);
  // }

  /**
   * @notice Returns true if the nonce has been used
   * @param signer address Address of the signer
   * @param nonce uint256 Nonce being checked
   */
  // function nonceUsed(address signer, uint256 nonce)
  //   public
  //   view
  //   returns (bool)
  // {
  //   uint256 groupKey = nonce / 256;
  //   uint256 indexInGroup = nonce % 256;
  //   return (_nonceGroups[signer][groupKey] >> indexInGroup) & 1 == 1;
  // }

  /**
   * @notice Returns the current chainId using the chainid opcode
   * @return id uint256 The chain id
   */
  // function getChainId() public view returns (uint256 id) {
  //   // no-inline-assembly
  //   assembly {
  //     id := chainid()
  //   }
  // }

  /**
   * @notice Marks a nonce as used for the given signer
   * @param signer address Address of the signer for which to mark the nonce as used
   * @param nonce uint256 Nonce to be marked as used
   * @return bool True if the nonce was not marked as used already
   */
  // function _markNonceAsUsed(address signer, uint256 nonce)
  //   internal
  //   returns (bool)
  // {
  //   uint256 groupKey = nonce / 256;
  //   uint256 indexInGroup = nonce % 256;
  //   uint256 group = _nonceGroups[signer][groupKey];

  //   // If it is already used, return false
  //   if ((group >> indexInGroup) & 1 == 1) {
  //     return false;
  //   }

  //   _nonceGroups[signer][groupKey] = group | (uint256(1) << indexInGroup);

  //   return true;
  // }

  // /**
  //  * @notice Checks Order Expiry, Nonce, Signature
  //  * @param nonce uint256 Unique and should be sequential
  //  * @param expiry uint256 Expiry in seconds since 1 January 1970
  //  * @param signerWallet address Wallet of the signer
  //  * @param signerToken address ERC20 token transferred from the signer
  //  * @param signerAmount uint256 Amount transferred from the signer
  //  * @param senderToken address ERC20 token transferred from the sender
  //  * @param senderAmount uint256 Amount transferred from the sender
  //  * @param v uint8 "v" value of the ECDSA signature
  //  * @param r bytes32 "r" value of the ECDSA signature
  //  * @param s bytes32 "s" value of the ECDSA signature
  //  */
  // function _checkValidOrder(
  //   uint256 nonce,
  //   uint256 expiry,
  //   address signerWallet,
  //   address signerToken,
  //   uint256 signerAmount,
  //   address senderWallet,
  //   address senderToken,
  //   uint256 senderAmount,
  //   uint8 v,
  //   bytes32 r,
  //   bytes32 s
  // ) internal {
  //   require(DOMAIN_CHAIN_ID == getChainId(), "CHAIN_ID_CHANGED");

  //   // Ensure the expiry is not passed
  //   require(expiry > block.timestamp, "EXPIRY_PASSED");

  //   bytes32 hashed = _getOrderHash(
  //     nonce,
  //     expiry,
  //     signerWallet,
  //     signerToken,
  //     signerAmount,
  //     senderWallet,
  //     senderToken,
  //     senderAmount
  //   );

  //   // Recover the signatory from the hash and signature
  //   address signatory = _getSignatory(hashed, v, r, s);

  //   // Ensure the signatory is not null
  //   require(signatory != address(0), "SIGNATURE_INVALID");

  //   // Ensure the nonce is not yet used and if not mark it used
  //   require(_markNonceAsUsed(signatory, nonce), "NONCE_ALREADY_USED");

  //   // Ensure the signatory is authorized by the signer wallet
  //   if (signerWallet != signatory) {
  //     require(
  //       authorized[signerWallet] != address(0) &&
  //         authorized[signerWallet] == signatory,
  //       "UNAUTHORIZED"
  //     );
  //   }
  // }

  // /**
  //  * @notice Hash order parameters
  //  * @param nonce uint256
  //  * @param expiry uint256
  //  * @param signerWallet address
  //  * @param signerToken address
  //  * @param signerAmount uint256
  //  * @param senderToken address
  //  * @param senderAmount uint256
  //  * @return bytes32
  //  */
  // function _getOrderHash(
  //   uint256 nonce,
  //   uint256 expiry,
  //   address signerWallet,
  //   address signerToken,
  //   uint256 signerAmount,
  //   address senderWallet,
  //   address senderToken,
  //   uint256 senderAmount
  // ) internal view returns (bytes32) {
  //   return
  //     keccak256(
  //       abi.encode(
  //         ORDER_TYPEHASH,
  //         nonce,
  //         expiry,
  //         signerWallet,
  //         signerToken,
  //         signerAmount,
  //         protocolFee,
  //         senderWallet,
  //         senderToken,
  //         senderAmount
  //       )
  //     );
  // }

  // /**
  //  * @notice Recover the signatory from a signature
  //  * @param hash bytes32
  //  * @param v uint8
  //  * @param r bytes32
  //  * @param s bytes32
  //  */
  // function _getSignatory(
  //   bytes32 hash,
  //   uint8 v,
  //   bytes32 r,
  //   bytes32 s
  // ) internal view returns (address) {
  //   return
  //     ecrecover(
  //       keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, hash)),
  //       v,
  //       r,
  //       s
  //     );
  // }

  }