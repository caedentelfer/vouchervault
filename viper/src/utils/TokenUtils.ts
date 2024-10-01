import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, AccountLayout } from '@solana/spl-token';
import { VoucherData } from './VoucherData';

/**
 * @author Caeden
 * 
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

    // Iterates through a wallet's token accounts and returns an array of mint addresses
    // stored inside the wallet
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
                // convert to number
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

    // Utility function to read a string from a buffer
    private readString(buffer: Buffer, offset: number, length: number): string {
        return buffer.slice(offset, offset + length).toString('utf8').replace(/\0/g, '`').trim();
    }

    // Fetch metadata for a token account with its mint address
    async getTokenMetadata(mintAddress: string): Promise<VoucherData> {
        try {
            const mintPublicKey = new PublicKey(mintAddress);
            const accountInfo = await this.connection.getAccountInfo(mintPublicKey);

            if (accountInfo === null) {
                throw new Error('Account not found');
            }

            const data = accountInfo.data;

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
                        // handle expiry
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
                // set description to uri returned description\
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

    // Populate an array of VoucherData type --> Used for VoucherList objects
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

    // Fetch the amount held in an escrow account
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

    // Fetch data from IPFS and return a VoucherData object
    // ---> uti points to JSON with data & IPFS for image
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




}
export default TokenUtils;