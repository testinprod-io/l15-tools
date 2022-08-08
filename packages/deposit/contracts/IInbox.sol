pragma solidity ^0.8.0;

interface IInbox {
    function depositNativeToken(uint256 amount, uint256 maxSubmissionCost) external returns (uint256);
}
