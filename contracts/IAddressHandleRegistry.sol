// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAddressHandleRegistry {
    event HandleClaimed(address indexed owner, bytes handle);
    event HandleReleased(address indexed owner, bytes handle);

    error InvalidHandle();
    error HandleTaken();
    error AlreadyHasHandle();
    error NoHandle();

    function vocabLength() external view returns (uint16);
    function maxLength() external view returns (uint8);
    function vocabHash() external view returns (bytes32);

    function handleOf(address owner) external view returns (bytes memory handle);
    function ownerOf(bytes calldata handle) external view returns (address owner);

    function claim(bytes calldata handle) external;
    function release() external;
}
