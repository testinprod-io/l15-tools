pragma solidity ^0.8.0;

interface ArbSys {
    function withdrawEth(address destination) external payable returns(uint);
}

