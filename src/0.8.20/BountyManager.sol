// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * BountyManager Contract for WXM Explorer
 */
contract BountyManager is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    IERC20 immutable private WXM_TOKEN;

    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;
    string private source;

    error UnexpectedRequestID(bytes32 requestId);

    event Response(bytes32 indexed requestId, bytes response, bytes err);

    struct RequestInfo {
        address sender;
        uint256 bountyId;
    }

    struct Bounty {
        uint256 bountyId;
        string centerLat;
        string centerLong;
        uint256 totalBounty;
        bool claimed;
    }

    mapping (bytes32 => RequestInfo) private requestSender;
    
    Bounty[] internal bounties;

    constructor(
        address router,
        address token
    ) FunctionsClient(router) ConfirmedOwner(msg.sender) {
        WXM_TOKEN = IERC20(token);
    }

    function createBounty(
        string memory centerLat,
        string memory centerLong,
        uint256 amount
    ) external {
        require(WXM_TOKEN.transferFrom(msg.sender ,address(this), amount), "Could not transfer token");

        bounties.push(Bounty ({
            bountyId: bounties.length,
            centerLat: centerLat,
            centerLong: centerLong,
            totalBounty: amount,
            claimed: false
        }));
    }

    function contribute (
        uint256 bountyId,
        uint256 amount
    ) external {
        require(!bounties[bountyId].claimed, "The bounty is already claimed");
        require(WXM_TOKEN.transferFrom(msg.sender ,address(this), amount), "Could not transfer token");
        bounties[bountyId].totalBounty += amount;
    }

    /**
     * @notice Send a request to claim a bounty
     * @param encryptedSecretsUrls Encrypted URLs where to fetch user secrets
     * @param donHostedSecretsSlotID Don hosted secrets slotId
     * @param donHostedSecretsVersion Don hosted secrets version
     * @param args List of arguments accessible from within the source code
     * @param bytesArgs Array of bytes arguments, represented as hex strings
     * @param subscriptionId Billing ID
     */
    function claimBounty(
        bytes memory encryptedSecretsUrls,
        uint8 donHostedSecretsSlotID,
        uint64 donHostedSecretsVersion,
        string[] memory args,
        bytes[] memory bytesArgs,
        uint64 subscriptionId,
        uint32 gasLimit,
        bytes32 donID,
        uint256 bountyId
    ) external onlyOwner returns (bytes32 requestId) {
        require (!bounties[bountyId].claimed, "The bounty is already claimed");

        string[] memory argsArr = new string[](4);
        argsArr[0] = args[0];
        argsArr[1] = bounties[bountyId].centerLat;
        argsArr[2] = bounties[bountyId].centerLong;
        argsArr[3] = args[1];
        
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);
        if (encryptedSecretsUrls.length > 0)
            req.addSecretsReference(encryptedSecretsUrls);
        else if (donHostedSecretsVersion > 0) {
            req.addDONHostedSecrets(
                donHostedSecretsSlotID,
                donHostedSecretsVersion
            );
        }
        if (args.length > 0) req.setArgs(argsArr);
        if (bytesArgs.length > 0) req.setBytesArgs(bytesArgs);
        s_lastRequestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donID
        );
        requestSender[s_lastRequestId] = RequestInfo({
            sender: msg.sender,
            bountyId: bountyId
        });
        return s_lastRequestId;
    }

    /**
     * @notice Store latest result/error
     * @param requestId The request ID, returned by sendRequest()
     * @param response Aggregated response from the user code
     * @param err Aggregated error from the user code or from the execution pipeline
     * Either response or error parameter will be set, but never both
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (s_lastRequestId != requestId) {
            revert UnexpectedRequestID(requestId);
        }
        s_lastResponse = response;
        s_lastError = err;

        require (keccak256(abi.encodePacked(string(response))) == keccak256(abi.encodePacked(string("true"))), "Not eligible");

        Bounty memory bounty = bounties[requestSender[requestId].bountyId];
        require (!bounty.claimed, "The bounty is already claimed");

        require(WXM_TOKEN.transfer(requestSender[requestId].sender, bounty.totalBounty), "Could not transfer token");
        bounty.claimed = true;
        bounties[requestSender[requestId].bountyId] = bounty;

        emit Response(requestId, s_lastResponse, s_lastError);
    }

    function setSource(string calldata _source) public {
        require (msg.sender == owner(), "Not authorized");
        source = _source;
    }

    function getBounties() public view returns(Bounty[] memory){
        return bounties;
    }
}
