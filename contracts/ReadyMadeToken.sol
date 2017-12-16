pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/token/StandardToken.sol";


contract ReadyMadeToken is StandardToken {

  string public constant name = "ReadyMadeToken";
  string public constant symbol = "RMT";
  uint8 public constant decimals = 18;

  function ReadyMadeToken() public {
    totalSupply = 1;
    balances[msg.sender] = totalSupply;
  }
}
