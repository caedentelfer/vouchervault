import { Buffer } from 'node:buffer';
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    MetadataPointerInstruction,
    TOKEN_2022_PROGRAM_ID,
    burnChecked,
    createAssociatedTokenAccount,
    createTransferCheckedInstruction,
    getAccount,
    getAccountLen,
    getAssociatedTokenAddress,
    transfer,
    transferChecked,
} from '@solana/spl-token';
import {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    SYSVAR_CLOCK_PUBKEY,
    SYSVAR_RENT_PUBKEY,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import { start } from 'solana-bankrun';
import {
    createInitEscrowAndMintVoucherInstruction,
    createInitMintAuthorityInstruction,
    createReleaseEscrowAndBurnVoucherInstruction,
} from './generated';
import { TokenMetadata } from '@solana/spl-token-metadata';
import { assert } from 'chai';
import { it } from 'mocha';
import { pinFileToIPFS, pinJSONToIPFS } from './uri';

function createKeypairFromFile(path: string): Keypair {
    return Keypair.fromSecretKey(
        Buffer.from(JSON.parse(require('node:fs').readFileSync(path, 'utf-8')))
    );
}

describe('gideon', async () => {
    const title = 'Nike Running Shoes';
    const description = 'Nike running shoes and stuff';
    const symbol = 'NIKE';
    var metadataURI = '';
    const expiry = Date.now() + 1000 * 60 * 60 * 24 * 7; // 1 week from now
    // const expiry = Date.now() - 1000 * 60 * 60 * 24 * 1; // 1 day ago

    const connection = new Connection(`http://localhost:8899`, 'confirmed');
    //const connection = new Connection('https://api.devnet.solana.com/', 'confirmed');
    const payer = createKeypairFromFile(
        `${require('node:os').homedir()}/.config/solana/id.json`
    );
    const program = createKeypairFromFile(
        './program/target/so/gideon-keypair.json'
    );

    const mintKeypair: Keypair = Keypair.generate();
    const mintAuthority = PublicKey.findProgramAddressSync(
        [Buffer.from('mint_authority')],
        program.publicKey
    );

    const recipient: Keypair = Keypair.generate();

    it('Init Mint Authority If Not Exists', async () => {
        // Check if mint authority exist
        try {
            await connection.getAccountInfo(mintAuthority[0]);
            const ix = createInitMintAuthorityInstruction({
                mintAuthority: mintAuthority[0],
                payer: payer.publicKey,
                systemProgram: SystemProgram.programId,
            });

            const sx = await sendAndConfirmTransaction(
                connection,
                new Transaction().add(ix),
                [payer]
            );

            console.log('Created Mint Authority:');
            console.log(`   Mint Authority: ${mintAuthority[0]}`);
            console.log(`   Tx Signature: ${sx}`);
        } catch (error) {
            console.log('Mint Authority Already Exists');
        }
    });

    it('Init Mint Authority PDA Bankrun', async () => {
        console.log(program.publicKey.toBase58());
        const context = await start(
            [
                {
                    name: 'program/target/so/gideon',
                    programId: program.publicKey,
                },
            ],
            []
        );
        const client = context.banksClient;
        const payer = context.payer;
        const blockhash = context.lastBlockhash;

        const ix = createInitMintAuthorityInstruction({
            mintAuthority: mintAuthority[0],
            payer: payer.publicKey,
            systemProgram: SystemProgram.programId,
        });

        const tx = new Transaction();
        tx.recentBlockhash = blockhash;
        tx.add(ix);
        tx.sign(payer);

        const meta = await client.processTransaction(tx);
        const logs = meta?.logMessages;
        assert(
            logs[1] === 'Program log: Creating mint authority PDA...',
            "Failed: Log 2 doesn't match"
        );
        assert(
            logs[2] === `Program log: Mint Authority: ${mintAuthority[0]}`,
            "Failed: Log 3 doesn't match"
        );
        assert(
            logs[3].startsWith(
                'Program 11111111111111111111111111111111 invoke'
            ),
            'Failed: No system program invoke occured'
        );
        assert(
            logs[4] === 'Program 11111111111111111111111111111111 success',
            'Failed: System program invoke appeared not successful'
        );
        assert(
            logs[5].startsWith(`Program ${program.publicKey} consumed`),
            "Failed: log 6 doesn't match"
        );
        assert(
            logs[6] === `Program ${program.publicKey} success`,
            'Failed: appeared not successful'
        );
    });

    it('Create URI', async () => {
        try {
            // Image URI
            const ipfsHash = await pinFileToIPFS('TestImage.png', title);
            console.log('IPFS Image Hash:', ipfsHash);
            assert(ipfsHash, 'IPFS hash should be defined');
            assert.strictEqual(
                typeof ipfsHash,
                'string',
                'IPFS hash should be a string'
            );

            // Metadata URI
            const metadata = {
                name: title,
                symbol: symbol,
                description: description,
                image: `https://ipfs.io/ipfs/${ipfsHash}`,
            };
            const ipfsMetadata = await pinJSONToIPFS(metadata, title);
            console.log('IPFS Metadata Hash:', ipfsMetadata);
            assert(ipfsMetadata, 'IPFS metadata hash should be defined');
            assert.strictEqual(
                typeof ipfsMetadata,
                'string',
                'IPFS metadata hash should be a string'
            );
            metadataURI = `https://ipfs.io/ipfs/${ipfsMetadata}`;
        } catch (error) {
            console.error('Test failed:', error);
            throw error;
        }
    });

    it('Init Escrow and Mint Voucher', async () => {
        // Generate Unique id
        const escrowAccount = PublicKey.findProgramAddressSync(
            [
                Buffer.from('escrow'),
                payer.publicKey.toBuffer(),
                recipient.publicKey.toBuffer(),
                mintKeypair.publicKey.toBuffer(),
            ],
            program.publicKey
        );
        const associatedTokenAccountAddress = await getAssociatedTokenAddress(
            mintKeypair.publicKey,
            payer.publicKey,
            false,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const ix = createInitEscrowAndMintVoucherInstruction(
            {
                escrowAccount: escrowAccount[0],
                mintAccount: mintKeypair.publicKey,
                mintAuthority: mintAuthority[0],
                associatedTokenAccount: associatedTokenAccountAddress,
                payer: payer.publicKey,
                rent: SYSVAR_RENT_PUBKEY,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            },
            {
                arg0: {
                    payer: payer.publicKey,
                    recipient: recipient.publicKey,
                    amount: 1 * LAMPORTS_PER_SOL,
                    voucherMint: mintKeypair.publicKey,
                },
                arg1: {
                    title: title,
                    description: description,
                    symbol: symbol,
                    uri: metadataURI,
                    expiry: expiry,
                },
            }
        );

        try {
            const sx = await sendAndConfirmTransaction(
                connection,
                new Transaction().add(ix),
                [payer, mintKeypair]
            );
            console.log('Success!');
            console.log(`   Escrow Address: ${escrowAccount[0]}`);
            console.log(`   Mint Address: ${mintKeypair.publicKey}`);
            console.log(`   ATA Address: ${associatedTokenAccountAddress}`);
            console.log(`   Mint Authority: ${mintAuthority[0]}`);
            console.log(`   Tx Signature: ${sx}`);
        } catch (e) {
            console.log(await e.getLogs());
            console.log(e);
            throw new Error('Failed');
        }
    });

    it('Transfer Voucher to Recipient', async () => {
        const airdropSignature = await connection.requestAirdrop(
            recipient.publicKey,
            LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(airdropSignature);

        const ataPayer = await getAssociatedTokenAddress(
            mintKeypair.publicKey,
            payer.publicKey,
            false,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        let ataRecipient = await createAssociatedTokenAccount(
            connection,
            payer,
            mintKeypair.publicKey,
            recipient.publicKey,
            {},
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        let tx = new Transaction().add(
            createTransferCheckedInstruction(
                ataPayer, // from (should be a token account)
                mintKeypair.publicKey, // mint
                ataRecipient, // to (should be a token account)
                payer.publicKey, // from's owner
                1, // amount, if your deciamls is 8, send 10^8 for 1 token
                0, // decimals
                [],
                TOKEN_2022_PROGRAM_ID
            )
        );

        const sx = await sendAndConfirmTransaction(connection, tx, [payer]);
        console.log('Success:');
        console.log(`   Mint: ${mintKeypair.publicKey}`);
        console.log(`   ataPayer: ${ataPayer}`);
        console.log(`   ataRecipient: ${ataRecipient}`);
        console.log(`   Tx Signature: ${sx}`);
    });

    it('Release Escrow and Burn Voucher', async () => {
        const ata = await getAssociatedTokenAddress(
            mintKeypair.publicKey,
            recipient.publicKey,
            false,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const escrowAccount = PublicKey.findProgramAddressSync(
            [
                Buffer.from('escrow'),
                payer.publicKey.toBuffer(),
                recipient.publicKey.toBuffer(),
                mintKeypair.publicKey.toBuffer(),
            ],
            program.publicKey
        );

        const ix = createReleaseEscrowAndBurnVoucherInstruction({
            payer: recipient.publicKey,
            ata: ata,
            mintAccount: mintKeypair.publicKey,
            mintAuthority: mintAuthority[0],
            escrowAccount: escrowAccount[0],
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            clockProgram: SYSVAR_CLOCK_PUBKEY,
            systemProgram: SystemProgram.programId,
        });

        console.log('Burning Voucher...');
        console.log(`   Recipient: ${recipient.publicKey}`);
        console.log(`   ATA: ${ata}`);
        console.log(`   Mint: ${mintKeypair.publicKey}`);
        console.log(`   Mint Authority: ${mintAuthority[0]}`);
        console.log(`   Escrow: ${escrowAccount[0]}`);

        try {
            const sx = await sendAndConfirmTransaction(
                connection,
                new Transaction().add(ix),
                [recipient]
            );
            console.log('Success!');
            console.log(`   Tx Signature: ${sx}`);
        } catch (e) {
            console.log(await e.getLogs());
            console.log(e);
            throw new Error('Failed');
        }
    });
});
