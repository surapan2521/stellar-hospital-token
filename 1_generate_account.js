const StellarSdk = require('stellar-sdk')
const YAML = require('node-yaml')
const configFile = 'config.yml'

const config = YAML.readSync(configFile)

const accountNames = ['issuer', 'gov', 'ngo', 'donor', 'contractor']
const startingBalance = '120'

var server = new StellarSdk.Server('https://horizon-testnet.stellar.org')
var masterKey = StellarSdk.Keypair.fromSecret(config.accounts.master.secret)
StellarSdk.Network.useTestNetwork()

generateAccounts()

async function generateAccounts () {
  let masterAccount
  try {
    masterAccount = await server.loadAccount(masterKey.publicKey())
  } catch (error) {
    console.log('Load Account Error = ', JSON.stringify(error, null, 4))
  }

  // Loop to create each accounts
  for (let i = 0; i < accountNames.length; i++) {
    const account = createAccount(accountNames[i], masterAccount)
    try {
      console.log('submitting account : ', accountNames[i])
      console.log('account.pair.publicKey() = ', account.pair.publicKey())
      await server.submitTransaction(account.transaction)
    } catch (error) {
      console.log('error = ', error.message, JSON.stringify(error.stack, null, 4))
    }

    // Update Config
    config.accounts[accountNames[i]] = {
      public: account.pair.publicKey(),
      secret: account.pair.secret()
    }
  }

  // Save to file
  YAML.writeSync(configFile, config)
  console.log('Success!')
}

function createAccount (name, masterAccount) {
  const pair = StellarSdk.Keypair.random()

  const transaction = new StellarSdk.TransactionBuilder(masterAccount)
    .addOperation(StellarSdk.Operation.createAccount({
      destination: pair.publicKey(),
      startingBalance
    })).build()
  transaction.sign(masterKey)
  return {
    transaction,
    pair
  }
}
