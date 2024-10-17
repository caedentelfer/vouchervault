import { useState, useCallback, useEffect, useRef } from 'react';
import { Connection, PublicKey, ParsedTransactionWithMeta, ParsedInstruction } from '@solana/web3.js';

const PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'; // Token program ID spl token 2022

const RPC_ENDPOINTS = [
    'https://api.devnet.solana.com',
    'https://rpc.ankr.com/solana_devnet',
    'https://devnet.helius-rpc.com/?api-key=876557a1-8800-41d5-bd16-45b53c362b6d',
];

class RPCManager {
    private static instance: RPCManager;
    private currentIndex: number = 0;

    private constructor() { }

    public static getInstance(): RPCManager {
        if (!RPCManager.instance) {
            RPCManager.instance = new RPCManager();
        }
        return RPCManager.instance;
    }

    public getNextConnection(): Connection {
        const endpoint = RPC_ENDPOINTS[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % RPC_ENDPOINTS.length;
        return new Connection(endpoint);
    }
}
interface Transfer {
    signature: string;
    timestamp: number;
    recipient: string;
    amount: number;
}

export const transferHooks = (walletAddress: string) => {
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    const fetchTransfers = useCallback(async () => {
        if (!walletAddress) {
            setError('Wallet address is required');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const rpcManager = RPCManager.getInstance();
            var connection = rpcManager.getNextConnection();
            const publicKey = new PublicKey(walletAddress);

            // Fetch recent signatures for the wallet
            const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 20 });

            // Fetch and parse transactions
            const transferList = (await Promise.all(
                signatures.map(async (sig) => {
                    var tx = await connection.getParsedTransaction(sig.signature);
                    if (!tx) {
                        console.log('Transaction not found:', sig.signature);
                        // Try another RPC endpoint
                        connection = rpcManager.getNextConnection();
                        tx = await connection.getParsedTransaction(sig.signature);
                        if (!tx) {
                            console.log('Transaction still not found:', sig.signature);
                            return null;
                        }
                    }
    
                    // Ensure the transaction is a token transfer SPL-Token 2022
                    const instructions = tx.transaction.message.instructions;
                    const transferInstruction = instructions.find(
                        (ix) => ix.programId.toString() === PROGRAM_ID
                    );
    
                    if (!transferInstruction) {
                        return null;
                    }
    
                    // Extract transfer details
                    const parsedIx = transferInstruction as ParsedInstruction;
                    if (parsedIx.parsed.type !== 'transfer') {
                        return null;
                    }
    
                    const { info } = parsedIx.parsed;
                    const recipientATA = new PublicKey(info.destination);
    
                    // Fetch the account info of the recipient ATA
                    const accountInfo = await connection.getAccountInfo(recipientATA);
                    if (!accountInfo) {
                        console.log('Account info not found for:', recipientATA.toString());
                        return null;
                    }
                                        
                    // Parse the account data to extract the actual owner
                    const accountDataLayout = {
                        mint: {offset: 0, length: 32},
                        owner: {offset: 32, length: 32},
                        amount: {offset: 64, length: 8},
                    };
                    
                    const ownerPubkey = new PublicKey(accountInfo.data.slice(
                        accountDataLayout.owner.offset,
                        accountDataLayout.owner.offset + accountDataLayout.owner.length
                    ));
                    
                    return {
                        signature: sig.signature,
                        timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
                        recipient: ownerPubkey.toString(),
                        amount: Number(info.amount) / Math.pow(10, info.decimals || 9),
                    };
                })
            )).filter((transfer): transfer is Transfer => transfer !== null);

            setTransfers(transferList);
        } catch (err) {
            console.error('Error fetching wallet transfers:', err);
            setError('Failed to fetch wallet transfers. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [walletAddress]);

    useEffect(() => {
        if (!hasFetched.current && walletAddress) {
            fetchTransfers();
            hasFetched.current = true;
        }
    }, [fetchTransfers, walletAddress]);

    return {
        transfers,
        loading,
        error,
        refetch: fetchTransfers
    };
};