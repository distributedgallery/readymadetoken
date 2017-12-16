var ReadyMadeAuction = artifacts.require("./ReadyMadeAuction");

module.exports = async function(deployer) {
  await deployer.deploy(ReadyMadeAuction)
  let auction = await ReadyMadeAuction.deployed()
  await auction.updateBeneficiary('0x17d38262cEb5317aF645a246B0Ce6FC4cC3088f6')
};
