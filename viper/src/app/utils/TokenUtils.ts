// src/utils/TokenUtils.ts

import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, AccountLayout } from '@solana/spl-token';
import { VoucherData } from '../utils/VoucherData';

/**
 * @brief Utility class to fetch token accounts and metadata
 *      --> Parses wallet address to fetch token accounts on the blockchain
 *     --> Fetches metadata for each token account 
 *    --> Fetches amount held in an escrow account
 */
export class TokenUtils {
    private connection: Connection;
    private tokenProgramId: PublicKey;

    constructor() {
        this.connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        this.tokenProgramId = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'); // NB do not change this
    }

    /**
     * Iterates through a wallet's token accounts and returns an array of mint addresses
     * stored inside the wallet, excluding zero balance accounts.
     * 
     * @param walletAddress The public key of the wallet as a string.
     * @returns An array of mint addresses as strings.
     */
    async getMintAddressesFromWalletAddress(walletAddress: string): Promise<string[]> {
        try {
            const walletPublicKey = new PublicKey(walletAddress);

            const accounts = await this.connection.getTokenAccountsByOwner(walletPublicKey, {
                programId: this.tokenProgramId,
            });

            if (accounts.value.length === 0) {
                console.log('No token accounts found.');
                return [];
            }

            const mintAddresses: string[] = [];
            for (const { account } of accounts.value) {
                const accountData = AccountLayout.decode(account.data);
                const mintAddress = new PublicKey(accountData.mint);

                // Check the balance for the mint address
                const balance = accountData.amount;
                // Convert to number
                if (balance === BigInt(0)) {
                    console.log('Skipping zero balance account:', mintAddress.toBase58());
                    continue;
                }

                mintAddresses.push(mintAddress.toBase58());
            }

            return mintAddresses;
        } catch (error) {
            console.error('Error fetching token accounts and mint info:', error);
            return [];
        }
    }

    /**
     * Utility function to read a string from a buffer
     * 
     * @param buffer The buffer containing the data.
     * @param offset The starting byte offset.
     * @param length The number of bytes to read.
     * @returns The decoded string.
     */
    private readString(buffer: Buffer, offset: number, length: number): string {
        return buffer.slice(offset, offset + length).toString('utf8').replace(/\0/g, '').trim();
    }

    /**
     * Fetch metadata for a token account with its mint address
     * 
     * @param mintAddress The mint address as a string.
     * @returns A VoucherData object containing the metadata.
     */
    async getTokenMetadata(mintAddress: string): Promise<VoucherData> {
        try {
            const mintPublicKey = new PublicKey(mintAddress);
            const accountInfo = await this.connection.getAccountInfo(mintPublicKey);

            if (accountInfo === null) {
                throw new Error('Account not found');
            }

            const data = accountInfo.data;

            // Adjust these offsets based on your program's data structure
            const metadataStartIndex = 304;
            const metadataLength = 240;
            const metadata = this.readString(data, metadataStartIndex, metadataLength);

            let voucherData: VoucherData = null;
            let name: string = '';
            let symbol: string = '';
            let uri: string = '';
            let escrowAddress: string = 'Not found when scanning metadata';
            let count = 0;
            let index = 0;
            let expiry = 0;

            for (let i = 0; i < metadataLength; i++) {
                if (metadata[i] === '`') {
                    index = i + 1;
                } else {
                    if (count === 0) {
                        name = metadata.substring(index);
                        name = name.substring(0, name.indexOf('`'));
                        count++;
                        i += name.length;
                    } else if (count === 1) {
                        symbol = metadata.substring(index);
                        symbol = symbol.substring(0, symbol.indexOf('`'));
                        count++;
                        i += symbol.length;
                    } else if (count === 2) {
                        uri = metadata.substring(index);
                        uri = uri.substring(0, uri.indexOf('`'));
                        count++;
                        i += uri.length;
                    } else if (count === 3) {
                        escrowAddress = metadata.substring(index);
                        escrowAddress = escrowAddress.substring(14);
                        // Handle expiry
                        if (escrowAddress.includes('expiry')) {
                            expiry = escrowAddress.indexOf('expiry');
                            escrowAddress = escrowAddress.substring(0, expiry - 4);
                            expiry = parseInt(metadata.substring(index + expiry + 7 + 17));
                        }
                        count++;
                        i += escrowAddress.length;
                    }
                }
            }

            // Get balance in SOL inside the escrow account
            let escrowBalance = 0;
            let escrow = 'Not found';
            if (escrowAddress !== 'Not found when scanning metadata') {
                escrowBalance = await this.getEscrowAccountAmount(escrowAddress);
                escrow = escrowBalance.toString();
            }

            let description: string = 'No description available';

            // Fetch the image from IPFS from the URI
            voucherData = (await this.fetchDataFromIPFS(uri));

            if (voucherData != null) {
                // Set description to URI returned description
                name = voucherData.name;
                symbol = voucherData.symbol;
                description = voucherData.description;
                uri = voucherData.uri;
            }

            return { mintAddress, name, symbol, description, uri, escrow, escrowAddress, expiry };
        } catch (error) {
            console.log('Error fetching token metadata:', mintAddress);
            return { mintAddress, name: '', symbol: '', description: '', uri: '', escrow: 'Not found', escrowAddress: 'Not found', expiry: 0 };
        }
    }

    /**
     * Populate an array of VoucherData type --> Used for VoucherList objects
     * 
     * @param walletAddress The public key of the wallet as a string.
     * @returns An array of VoucherData objects.
     */
    async populateVoucherArray(walletAddress: string): Promise<VoucherData[]> {
        try {
            const mintAddresses = await this.getMintAddressesFromWalletAddress(walletAddress);
            const voucherArray: VoucherData[] = [];

            for (const mintAddress of mintAddresses) {
                const metadata = await this.getTokenMetadata(mintAddress);
                voucherArray.push(metadata);
            }

            return voucherArray;
        } catch (error) {
            console.error('Error populating voucher array:', error);
            return [];
        }
    }

    /**
     * Fetch the amount held in an escrow account
     * 
     * @param escrowPublicKey The public key of the escrow account as a string.
     * @returns The balance in SOL.
     */
    async getEscrowAccountAmount(escrowPublicKey: string): Promise<number> {
        try {
            const escrowPubkey = new PublicKey(escrowPublicKey);
            const accountInfo = await this.connection.getAccountInfo(escrowPubkey);

            if (accountInfo === null) {
                throw new Error('Account not found');
            }

            const balance = accountInfo.lamports; // Amount in lamports (1 SOL = 1e9 lamports)

            return balance / 1e9;
        } catch (error) {
            console.log('Error fetching escrow account amount for escrow:', escrowPublicKey);
            return 0;
        }
    }

    /**
     * Fetch data from IPFS and return a VoucherData object
     * 
     * @param ipfsUrl The URL to fetch the JSON metadata from IPFS.
     * @returns A VoucherData object or null if fetching fails.
     */
    async fetchDataFromIPFS(ipfsUrl: string): Promise<VoucherData | null> {
        try {
            const response = await fetch(ipfsUrl);
            const contentType = response.headers.get('Content-Type');

            if (contentType && contentType.includes('application/json')) {
                // Fetch and parse the JSON data
                const data = await response.json();

                if (data && typeof data === 'object') {
                    return {
                        mintAddress: 'none',
                        name: data.name || '',
                        symbol: data.symbol || '',
                        description: data.description || 'No description available',
                        uri: data.image || '',
                        escrow: 'none',
                        escrowAddress: 'none',
                        expiry: 0,
                    };
                } else {
                    console.error('Invalid data structure received from IPFS.');
                    return null;
                }
            } else {
                const data = await response.blob();
                console.error('Expected JSON but received different content type.');
                return null;
            }
        } catch (error) {
            console.error('Error fetching data from IPFS:', error);
            return null;
        }
    }

    /**
     * Retrieves the recipient (target company) wallet address from a given escrow address.
     * 
     * @param escrowAddress The public key of the escrow account as a string.
     * @returns The recipient's wallet address as a string, or null if not found.
     */
    async getRecipientFromEscrow(escrowAddress: string): Promise<string | null> {
        try {
            const escrowPubkey = new PublicKey(escrowAddress);
            const accountInfo = await this.connection.getAccountInfo(escrowPubkey);

            if (accountInfo === null) {
                console.error('Escrow account not found:', escrowAddress);
                return null;
            }

            const data = accountInfo.data;

            /**
             * @brief Decode the recipient address from the escrow account data.
             * 
             * Assumptions:
             * - The escrow account data has a fixed layout.
             * - The recipient's public key is stored at a specific byte offset.
             * - Adjust `recipientOffset` based on your program's actual data structure.
             */

            // Example: Adjust these offsets based on your program's data structure
            const accountDiscriminatorLength = 8; // Commonly, account discriminators are 8 bytes
            const payerPublicKeyLength = 32; // Payer's public key is 32 bytes
            const recipientOffset = accountDiscriminatorLength + payerPublicKeyLength; // Starting byte for recipient's public key

            // Ensure the data buffer is long enough
            if (data.length < recipientOffset + 32) {
                console.error('Escrow account data is too short to contain recipient address.');
                return null;
            }

            const recipientBytes = data.slice(recipientOffset, recipientOffset + 32);
            const recipientPubkey = new PublicKey(recipientBytes);

            console.log('Decoded Recipient (Target Company) Address:', recipientPubkey.toBase58());

            return recipientPubkey.toBase58();
        } catch (error) {
            console.error('Error fetching recipient from escrow:', error);
            return null;
        }
    }

    /**
     * Decode and print the entire escrow account data.
     * Useful for determining byte offsets.
     * 
     * @param escrowAddress The public key of the escrow account as a string.
     */
    async printEscrowAccountData(escrowAddress: string): Promise<void> {
        try {
            const escrowPubkey = new PublicKey(escrowAddress);
            const accountInfo = await this.connection.getAccountInfo(escrowPubkey);

            if (accountInfo === null) {
                console.error('Escrow account not found:', escrowAddress);
                return;
            }

            const data = accountInfo.data;

            console.log('--- Escrow Account Data ---');
            console.log('Total Length:', data.length, 'bytes');
            console.log('Hex Representation:', data.toString('hex'));

            // Attempt to print as UTF-8 string (may include binary data)
            const utf8Data = data.toString('utf8');
            console.log('UTF-8 Representation:', utf8Data);

            // For better readability, print in chunks
            const chunkSize = 32;
            for (let i = 0; i < data.length; i += chunkSize) {
                const chunk = data.slice(i, i + chunkSize);
                console.log(`Bytes ${i}-${i + chunkSize - 1}:`, chunk.toString('hex'));
            }

            console.log('----------------------------');
        } catch (error) {
            console.error('Error printing escrow account data:', error);
        }
    }
}

export default TokenUtils;
