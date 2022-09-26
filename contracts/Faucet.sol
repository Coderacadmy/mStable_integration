// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "contracts/interfaces/IERC20.sol";

contract Faucet {
    // using SafeERC20 for IERC20;
    

    fallback() external payable {}

    receive() external payable {}

    function drain() external payable {
        uint256 give = msg.value * 2;
        payable(msg.sender).transfer(give);
    }

    function drainToken(address token, uint256 amount) external {
        uint256 give = amount * 2;
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        IERC20(token).transfer(msg.sender, give);
    }
}
