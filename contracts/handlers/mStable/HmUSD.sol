// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "../HandlerBase.sol";

contract Token {
    
    string public name = "My Hardhat Token";
    string public symbol = "MHT";
    uint256 public totalSupply = 1000000;
    address public owner;

    mapping(address => uint256) balances;
    event Transfer(address indexed _from, address indexed _to, uint256 _value);

    modifier onlyOwner {
    require(owner == msg.sender); //if msg.sender != owner, then mint function will fail to execute.
    _;
}

    constructor() {
        balances[msg.sender] = totalSupply;
        owner = msg.sender;
    }

    function transfer(address to, uint256 amount) internal {
        require(balances[msg.sender] >= amount, "Not enough tokens");

        balances[msg.sender] -= amount;
        balances[to] += amount;

        emit Transfer(msg.sender, to, amount);
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function _mint(address to, uint256 amount) onlyOwner public  returns (bool) {
    totalSupply = totalSupply + amount;
    balances[to] += amount;
    // Mint(_to, _amount);
    return true;
  }
}


contract HmUSD is Token, HandlerBase {

    struct Asset {
    uint8 idx;
    address addr;
    bool exists;
    }

    struct InvariantConfig {
    uint256 supply;
    uint256 a;
    // WeightLimits limits;
    uint256 recolFee;
}

    struct MassetData {
    uint256 swapFee;
    uint256 redemptionFee;
    uint256 cacheSize;
    uint256 surplus;
}


    // mapping(address => uint8) public override bAssetIndexes;
    mapping(address => uint8) public bAssetIndexes;

    function getContractName() public pure override returns (string memory) {
        return "HmSwap";
    }


    function _getAsset(address _asset) internal view returns (Asset memory asset) {
        asset.idx = bAssetIndexes[_asset];
        asset.addr = _asset;
        // asset.exists = data.bAssetPersonal[asset.idx].addr == _asset;
        require(asset.exists, "Invalid asset");
    }

    function mint(
        address _input,
        uint256 _inputQuantity,
        uint256 _minOutputQuantity,
        address _recipient
    ) external returns (uint256 mintOutput) {
        require(_recipient != address(0), "Invalid recipient");
        require(_inputQuantity > 0, "Qty==0");
        // Mint the Masset
        _mint(_recipient, mintOutput);
        return(mintOutput);
        // transfer(_recipient, mintOutput);
    }


    function swap(
        address _input,
        address _output,
        uint256 _inputQuantity,
        uint256 _minOutputQuantity,
        address _recipient
    ) external returns (uint256 swapOutput) {
        require(_recipient != address(0), "Invalid recipient");
        require(_input != _output, "Invalid pair");
        require(_inputQuantity > 0, "Invalid swap quantity");
        return(swapOutput);
    }

}