pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./ReadyMadeToken.sol";


contract ReadyMadeAuction {
  using SafeMath for uint256;
  
  address public beneficiary;
  
  ReadyMadeToken public rmt;

  uint256 constant public duration = 30 days;
  uint256 public begin;
  uint256 public end;

  bool public begun = false;
  bool public closed = false;

  uint256 constant public minBid = 1 ether;
  uint256 constant public maxBid = 5000 ether;
      
  address public highestBidder;
  uint256 public highestBid;
  mapping(address => uint) public pendingReturns;  

  event NewHighestBid(address bidder, uint256 amount);
  event Withdrawn(address bidder, uint256 amount);
  event AuctionClosed(address winner, uint256 amount);
  event BeneficiaryUpdated(address oldBeneficiary, address newBeneficiary);

  modifier onlyBeneficiary {
      require(msg.sender == beneficiary);
      _;
  }

  modifier setHasBegun {
    if(!begun) {
      begun = true;
      begin = now;
      end = begin + duration;
    }
    _;
  }

  modifier countdownHasNotEnded {
    require(now <= end);
    _;
  }
  
  modifier countdownHasEnded {
    require(now > end);
    _;
  }
  
  modifier isNotClosed {
    require(!closed);
    _;
  }

  function ReadyMadeAuction() public {
      beneficiary = msg.sender;
      rmt = new ReadyMadeToken();
  }

  function bid() setHasBegun countdownHasNotEnded isNotClosed public payable {
      require(msg.sender != highestBidder);
      require(msg.value >= minBid);
      require(pendingReturns[msg.sender].add(msg.value) > highestBid);
      
      if (highestBidder != address(0)) {
        pendingReturns[highestBidder] = highestBid;
      }
      
      highestBidder = msg.sender;
      highestBid = pendingReturns[msg.sender].add(msg.value);
      delete pendingReturns[msg.sender];
      
      NewHighestBid(highestBidder, highestBid);
      
      if (highestBid >= maxBid) {
        _close();
      }
  }

  function pendingReturn(address _bidder) view public returns (uint256 pending) {
    require(_bidder != address(0));
    return pendingReturns[_bidder];
  }

  function withdraw() public {
      require(pendingReturns[msg.sender] > 0);
      
      uint amount = pendingReturns[msg.sender];
      Withdrawn(msg.sender, amount);
      
      pendingReturns[msg.sender] = 0;
      msg.sender.transfer(amount);
  }

  function close() onlyBeneficiary countdownHasEnded isNotClosed public {
      _close();
  }

  function updateBeneficiary(address _newBeneficiary) onlyBeneficiary public {
      require(_newBeneficiary != address(0));
      BeneficiaryUpdated(beneficiary, _newBeneficiary);
      beneficiary = _newBeneficiary;
  }

  function _close() isNotClosed internal {
      closed = true;
      AuctionClosed(highestBidder, highestBid);
      beneficiary.transfer(highestBid); // address.transfer throws if it fails
      require(rmt.transfer(highestBidder, 1));
  }

}