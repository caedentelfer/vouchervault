# Gideon

A solana program.

## Install

First you need to install rust with rustup.rs. You can do this by running the following.

```sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Then you need to install solana-cli. You can do this by running the following.

```sh
sh -c "$(curl -sSfL https://release.solana.com/v1.18.18/install)"
```

Now with everything installed you can clone the repo and proceed to setup.

## Setup

First make sure yarn, rust (with rustup), and solana-cli is installed on your system, then in the `gideon/` directory run the following.

```sh
yarn install
```

Now, you need to run:

```sh
yarn build
```

This will build the solana program and create the program's keypair in `program/taget/so/gideon-keypair.json`. Next run:

```sh
solana-keygen pubkey program/target/so/gideon-keypair.json
```

This will print out the public key of the program. Copy this and replace the key in `declare_id!()` in the file `program/src/processor.rs`.

Now we can begin deploying our program. First run:

```sh
yarn build
```

This will build the program with the correct public key declared. Then run:

```sh
yarn solita
```

This will generate the IDL and the SDK for the test client to utilise. 

Now we have to set up solana. To do this you need to run 

```sh
solana-keygen
```

To generate your keypair. Then on a separate terminal you need to run 

```sh
solana-test-validator
```

This will run a local blockchain, before you deploy you need to configure solana to use the local blockchain.

```sh
solana config set -u localhost
```

After this you need to airdrop tokens to your account by running

```sh
solana airdrop 5 # OR whatever amount you desire
```

Now we are ready to deploy to the blockchain. Simply run

```sh
yarn deploy

# The output should look like this
yarn run v1.22.22

Program Id: 6QvMxbGZxNW57FhGRDeMzMbu8y5Me61x2DhfBqpznMYT
```

This can be run whenever and it will simply upgrade the program with the code.

Finally to test the code, run

```sh
yarn test

# The output should look like this
  gideon
Success!
   Mint Address: HhfVvJSQGr5kEUJzNUCgm8w4JZ2sWyS7DG8UU3TqWzBg
   Tx Signature: 2CLCp5zYqCHiHncNpkKPRaboAsQ47WfH8jGripPWzBHdjqPA58VjBQGGixTFb51XxoophBQWrFmDqbi6LHWxXmr
    ✔ Create an NFT (1247ms)
Success!
   ATA Address: 7zopH9wzScm9Q22beQvyDYjNA692YeDo4WWoKK8EgJt4
   Tx Signature: 3YCj1VtDqLHKN3c2UdbpGCGuS2YAPusmPofMeG1JBCAo86ePpSTd16CkYCDRdfvTc8zr3bETxmDj6nev1anX7nix
    ✔ Mint the NFT to your wallet (1677ms)


  2 passing (3s)

✨  Done in 3.96s.
```