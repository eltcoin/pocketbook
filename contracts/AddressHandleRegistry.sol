// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IAddressHandleRegistry.sol";

contract AddressHandleRegistry is IAddressHandleRegistry {
    mapping(address => bytes) private _handleOf;
    mapping(bytes32 => address) private _ownerOfByHash;

    uint16 public immutable override vocabLength;
    uint8 public immutable override maxLength;
    bytes32 public immutable override vocabHash;

    constructor(uint16 vocabLength_, uint8 maxLength_, bytes32 vocabHash_) {
        if (vocabLength_ == 0) revert InvalidHandle();
        if (maxLength_ == 0) revert InvalidHandle();

        vocabLength = vocabLength_;
        maxLength = maxLength_;
        vocabHash = vocabHash_;
    }

    function handleOf(address owner)
        external
        view
        override
        returns (bytes memory handle)
    {
        return _handleOf[owner];
    }

    function ownerOf(bytes calldata handle)
        public
        view
        override
        returns (address owner)
    {
        return _ownerOfByHash[keccak256(handle)];
    }

    function claim(bytes calldata handle) external override {
        if (_handleOf[msg.sender].length != 0) revert AlreadyHasHandle();
        if (!_isValidHandle(handle)) revert InvalidHandle();

        bytes32 key = keccak256(handle);
        if (_ownerOfByHash[key] != address(0)) revert HandleTaken();

        _handleOf[msg.sender] = handle;
        _ownerOfByHash[key] = msg.sender;

        emit HandleClaimed(msg.sender, handle);
    }

    function release() external override {
        bytes memory handle = _handleOf[msg.sender];
        if (handle.length == 0) revert NoHandle();

        delete _handleOf[msg.sender];
        delete _ownerOfByHash[keccak256(handle)];

        emit HandleReleased(msg.sender, handle);
    }

    function _isValidHandle(bytes calldata handle) internal view returns (bool) {
        if (handle.length == 0) return false;

        uint8 L = uint8(handle[0]);
        if (L == 0 || L > maxLength) return false;

        if (handle.length != 1 + 2 * uint256(L)) return false;

        uint16 vlen = vocabLength;
        uint256 offset = 1;

        for (uint256 i = 0; i < L; ++i) {
            uint16 idx = (uint16(uint8(handle[offset])) << 8) |
                uint16(uint8(handle[offset + 1]));
            if (idx >= vlen) return false;
            offset += 2;
        }

        return true;
    }
}
