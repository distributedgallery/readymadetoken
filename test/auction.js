import expectThrow  from './helpers/expectThrow';

const ReadyMadeAuction = artifacts.require('ReadyMadeAuction')
const ReadyMadeToken = artifacts.require('ReadyMadeToken')


function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

contract('ReadyMadeAuction', async function (accounts) {
  
  ////////////
  // Ready-Made Token handling
  ////////////
  
  it('should deploy and init the Ready-Made Token correctly', async function () {
    let auction = await ReadyMadeAuction.new()
    let rmt = ReadyMadeToken.at(await auction.rmt())
    let totalSupply = await rmt.totalSupply()
    let balance = await rmt.balanceOf(auction.address)
    
    assert.equal(totalSupply, 1, 'the Ready-Made Token totalSupply is incorrect')
    assert.equal(balance, 1, 'the Ready-Made Token\' auction balance is incorrect')
  })
  
  ////////////
  // Beneficiary handling
  ////////////
  
  it('should register the initial beneficiary correctly', async function () {
    let auction = await ReadyMadeAuction.new()
    let beneficiary = await auction.beneficiary()
    
    assert.equal(beneficiary, accounts[0], "the beneficiary is incorrect")
  })
  
  it('should allow the beneficiary to update his address correctly', async function () {
    let auction = await ReadyMadeAuction.new()
    await auction.updateBeneficiary(accounts[1])
    let beneficiary = await auction.beneficiary()
    
    assert.equal(beneficiary, accounts[1], "the updated beneficiary is incorrect")
  })
  
  it('should not allow anyone else than the current beneficiary to update his address', async function () {
    let auction = await ReadyMadeAuction.new()
    await expectThrow(auction.updateBeneficiary(accounts[1], { from: accounts[1] }))
  })
  
  ////////////
  // Bids handling
  ////////////
  
  it('should register new highest bids and bidders correctly', async function () {
    let auction = await ReadyMadeAuction.new()
    let BID_1 = 1*Math.pow(10, 18)
    let BID_2 = 2*Math.pow(10, 18)
    
    await auction.bid({ value: BID_1 })
    await auction.bid({ from: accounts[1], value: BID_2 })
    
    let highestBidder = await auction.highestBidder()
    let highestBid = await auction.highestBid()
    
    assert.equal(highestBidder, accounts[1], "the highest bidder is incorrect")
    assert.equal(highestBid, BID_2, "the highest bid is incorrect")
  })
  
  it('should receive the value of bids correctly', async function () {
    let auction = await ReadyMadeAuction.new()
    let BID = 1*Math.pow(10, 18)
    
    let initialBalance = web3.eth.getBalance(auction.address)
    await auction.bid({ value: BID })
    let newBalance = web3.eth.getBalance(auction.address)
    let difference = newBalance - initialBalance
    
    assert.equal(difference, BID, "the auction's contract balance is incorrect")
  })
  
  it('should add new bid to old bids of the same bidder correctly', async function () {
    let auction = await ReadyMadeAuction.new()
    
    let BID_1 = 1*Math.pow(10, 18)
    let BID_2 = 2*Math.pow(10, 18)
    let BID_3 = 2*Math.pow(10, 18)
    let BID_4 = 4*Math.pow(10, 18)
    let BID_5 = 2*Math.pow(10, 18)
    
    await auction.bid({ value: BID_1 })
    await auction.bid({ from: accounts[1], value: BID_2 })
    await auction.bid({ value: BID_3 })
    await auction.bid({ from: accounts[2], value: BID_4 })
    await auction.bid({ value: BID_5 })

    let highestBidder= await auction.highestBidder()
    let highestBid= await auction.highestBid()
    
    assert.equal(highestBidder, accounts[0], "the highest bidder is incorrect")
    assert.equal(highestBid, BID_1 + BID_3 + BID_5, "the highest bid is incorrect")
  })
  
  it('should not allow bids under the minimum bid', async function () {
    let auction = await ReadyMadeAuction.new()
    
    let MIN_BID = await auction.minBid()
    let SMALL_BID = MIN_BID.valueOf() - Math.pow(10, 15)
    
    await expectThrow(auction.bid({ value: SMALL_BID }))
  })
  
  it('should not allow highest bidder to overbid himself', async function () {
    let auction = await ReadyMadeAuction.new()
    let BID_1 = 1*Math.pow(10, 18)
    let BID_2 = 2*Math.pow(10, 18)
    
    await auction.bid({ value: BID_1 })
    
    await expectThrow(auction.bid({ value: BID_2 }))
  })
  
  it('should register pending returns correctly', async function () {
    let auction = await ReadyMadeAuction.new()
    
    let BID_1 = 1*Math.pow(10, 18)
    let BID_2 = 2*Math.pow(10, 18)
    let BID_3 = 2*Math.pow(10, 18)
    let BID_4 = 4*Math.pow(10, 18)
    let BID_5 = 2*Math.pow(10, 18)
    let BID_6 = 6*Math.pow(10, 18)
    
    await auction.bid({ value: BID_1 })
    await auction.bid({ from: accounts[1], value: BID_2 })
    await auction.bid({ value: BID_3 })
    await auction.bid({ from: accounts[2], value: BID_4 })
    await auction.bid({ value: BID_5 })
    await auction.bid({ from: accounts[1], value: BID_6 })
    
    let pendingReturnWinner = await auction.pendingReturn(accounts[1])
    let pendingReturnLooser1 = await auction.pendingReturn(accounts[0])
    let pendingReturnLooser2 = await auction.pendingReturn(accounts[2])
    
    assert.equal(pendingReturnLooser1.valueOf(), BID_1 + BID_3 + BID_5, "the pending return for the first looser bidder is incorrect")
    assert.equal(pendingReturnLooser2.valueOf(), BID_4, "the pending return for the second looser bidder is incorrect")
    assert.equal(pendingReturnWinner.valueOf(), 0, "the pending return for the winner bidder is incorrect")
  })
  
  ////////////
  // Withdraws handling
  ////////////
  
  it('should allow bidders to withdraw their lost bids', async function () {
    let auction = await ReadyMadeAuction.new()
    
    let BID_1 = 1*Math.pow(10, 18)
    let BID_2 = 2*Math.pow(10, 18)
    
    await auction.bid({ value: BID_1 })
    await auction.bid({ from: accounts[1], value: BID_2 })
    
    let initialContractBalance = web3.eth.getBalance(auction.address)
    let initialBidderBalance = web3.eth.getBalance(accounts[0])

    await auction.withdraw()
    
    let newContractBalance = web3.eth.getBalance(auction.address)
    let newBidderBalance = web3.eth.getBalance(accounts[0])
    
    let contractDifference = newContractBalance - initialContractBalance
    let bidderDifference = newBidderBalance - initialBidderBalance
    
    assert.equal(contractDifference, -BID_1, "the contract balance is incorrect")
    assert(BID_1 - (BID_1 / 10) < bidderDifference && bidderDifference < BID_1, "the bidder balance is incorrect")

  })
  
  it('should not allow bidders to withdraw their lost bids more than once', async function () {
    let auction = await ReadyMadeAuction.new()
    
    let BID_1 = 1*Math.pow(10, 18)
    let BID_2 = 2*Math.pow(10, 18)
    
    await auction.bid({ value: BID_1 })
    await auction.bid({ from: accounts[1], value: BID_2 })
    await auction.withdraw()

    await expectThrow(auction.withdraw())
  })
  
  it('should not allow the highest bidder to withdraw his bid', async function () {
    let auction = await ReadyMadeAuction.new()
    
    let BID_1 = 1*Math.pow(10, 18)
    let BID_2 = 2*Math.pow(10, 18)
    
    await auction.bid({ value: BID_1 })
    await auction.bid({ from: accounts[1], value: BID_2 })

    await expectThrow(auction.withdraw({ from: accounts[1] }))
  })
  
  it('should not allow anyone else than bidders to withdraw', async function () {
    let auction = await ReadyMadeAuction.new()
    
    let BID_1 = 1*Math.pow(10, 18)
    let BID_2 = 2*Math.pow(10, 18)
    
    await auction.bid({ value: BID_1 })
    await auction.bid({ from: accounts[1], value: BID_2 })

    await expectThrow(auction.withdraw({ from: accounts[2] }))
  })
  
  ////////////
  // Auction closing
  ////////////
  
  it('should close the auction if its receives a bid over or equal to the maxium bid', async function () {
    let auction = await ReadyMadeAuction.new()
    
    let MAX_BID = await auction.maxBid()
    let beneficiary = await auction.beneficiary()
    let rmt = ReadyMadeToken.at(await auction.rmt())
    let initialBeneficiaryBalance = web3.eth.getBalance(beneficiary)
    
    await auction.bid({ from: accounts[1], value: MAX_BID})
    
    let newBeneficiaryBalance = web3.eth.getBalance(beneficiary)
    let closed = await auction.closed()
    let beneficiaryDifference = newBeneficiaryBalance - initialBeneficiaryBalance
    let winnerRmtBalance = await rmt.balanceOf(accounts[1])
    
    assert.equal(closed, true, "the auction has not been closed")
    assert(MAX_BID - MAX_BID/10 < beneficiaryDifference,  "the beneficiary balance is incorrect")
    assert.equal(winnerRmtBalance, 1, "the winner RMT balance is incorrect")
  })
  
  it('should allow the beneficiary to end the auction after the end of the countdown', async function () {
    let auction = await ReadyMadeAuction.new()
    
    // Needs to modify the duration parameter in the ReadyMadeAuction 
    // contract to make this test practicable. Works well with a 30 seconds duration.
    let BID = 2*Math.pow(10, 18)
    let beneficiary = await auction.beneficiary()
    let rmt = ReadyMadeToken.at(await auction.rmt())
    let initialBeneficiaryBalance = web3.eth.getBalance(beneficiary)
    
    await auction.bid({ from: accounts[1], value: BID})
    
    await timeout(40*1000)
      
    await auction.close()
      
    let newBeneficiaryBalance = web3.eth.getBalance(beneficiary)
    let closed = await auction.closed()
    let beneficiaryDifference = newBeneficiaryBalance - initialBeneficiaryBalance
    let winnerRmtBalance = await rmt.balanceOf(accounts[1])
    
    
    assert.equal(closed, true, "the auction has not been closed")
    assert(BID - BID/10 < beneficiaryDifference,  "the beneficiary balance is incorrect")
    assert.equal(winnerRmtBalance, 1, "the winner RMT balance is incorrect")
      
  })
  
  it('should not allow anyone else than the beneficiary to end the auction even after the end of the countdown', async function () {
    let auction = await ReadyMadeAuction.new()
    
    // Needs to modify the duration parameter in the ReadyMadeAuction 
    // contract to make this test practicable. Works well with a 30 seconds duration.
    let BID = 2*Math.pow(10, 18)
    let beneficiary = await auction.beneficiary()
    let rmt = ReadyMadeToken.at(await auction.rmt())
    let initialBeneficiaryBalance = web3.eth.getBalance(beneficiary)
    
    await auction.bid({ from: accounts[1], value: BID})
    
    await timeout(40*1000)
    
    await expectThrow(auction.close({ from: accounts[2] }))

  })
  
  it('should not allow the beneficiary to end the auction before the end of the countdown', async function () {
    let auction = await ReadyMadeAuction.new()
    
    // Needs to modify the duration parameter in the ReadyMadeAuction 
    // contract to make this test practicable. Works well with a 30 seconds duration.
    let BID = 2*Math.pow(10, 18)
    let beneficiary = await auction.beneficiary()
    let rmt = ReadyMadeToken.at(await auction.rmt())
    let initialBeneficiaryBalance = web3.eth.getBalance(beneficiary)
    
    await auction.bid({ from: accounts[1], value: BID})
    
    await expectThrow(auction.close())

  })

})