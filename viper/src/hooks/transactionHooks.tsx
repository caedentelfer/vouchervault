import { useState, useCallback, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { CurrencyConverter } from 'utils/CurrencyConverter';
import { TokenUtils } from '../utils/TokenUtils';

const PROGRAM_ID = 'gidsaNxwQbr6pyLDaqVn4pPwAypkjwFNZQvvKBJ1Rbi';
const FALLBACK_IMAGE_URL = "https://cdn-icons-png.flaticon.com/512/3514/3514447.png";

const RPC_ENDPOINTS = [
    'https://api.devnet.solana.com',
    'https://rpc.ankr.com/solana_devnet',
    'https://devnet.helius-rpc.com/?api-key=876557a1-8800-41d5-bd16-45b53c362b6d',
];

class RPCManager {
    private static instance: RPCManager;
    private currentIndex: number = 0;

    private constructor() {}

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

interface Transaction {
    signature: string;
    timestamp: number;
    isCreateVoucher: boolean;
    performer: string;
    voucherInfo?: {
        mintAddress: string;
        name: string;
        symbol: string;
        isBurnt: boolean;
        escrow: string;
        escrowAddress: string;
        uri: string;
        expiry?: number;
    };
}

export const useTransactions = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [signatures, setSignatures] = useState<string[]>([]);  // Store all fetched signatures
    const [imageSrcs, setImageSrcs] = useState<{ [key: string]: string }>({});
    const [convertedValues, setConvertedValues] = useState<{ [key: string]: number }>({});
    const [currencySymbol, setCurrencySymbol] = useState('R');

    // Fetch all signatures once
    const fetchSignatures = useCallback(async () => {
        if (signatures.length === 0) {
            const rpcManager = RPCManager.getInstance();
            const connection = rpcManager.getNextConnection();
            const programId = new PublicKey(PROGRAM_ID);

            try {
                const allSignatures = await connection.getSignaturesForAddress(programId, { limit: 50 });
                setSignatures(allSignatures.map(sig => sig.signature));
            } catch (error) {
                console.error('Error fetching signatures:', error);
            }
        }
    }, [signatures]);

    const fetchTransactions = useCallback(async (page: number) => {
        setLoading(true);

        try {
            // Use pre-fetched signatures
            const start = (page - 1) * 10;
            const end = start + 10;
            const pageSignatures = signatures.slice(start, end);

            const rpcManager = RPCManager.getInstance();
            var connection = rpcManager.getNextConnection();

            const transactionDetails = await Promise.all(
                pageSignatures.map(async (signature) => {
                    var tx = await connection.getParsedTransaction(signature);
                    if (!tx) {
                        console.log('Transaction not found:', signature);
                        // Try another RPC endpoint
                        connection = rpcManager.getNextConnection();
                        tx =  await connection.getParsedTransaction(signature);
                        if (!tx) {
                            console.log('Transaction still not found:', signature);
                            return null;
                        }
                    }

                    let isCreateVoucher = false;
                    if (tx.meta && tx.meta.logMessages) {
                        isCreateVoucher = tx.meta.logMessages.some(log => log.includes("NFT minted successfully"));
                    }

                    const lamportsToSol = (lamports: number) => lamports / 10 ** 9;

                    let voucherInfo;
                    if (isCreateVoucher) {
                        const mintAddressLog = tx.meta.logMessages.find(log => log.includes("Program log: Mint:"));
                        const regex = /Mint:\s([A-Za-z0-9]+)/;
                        const mintAddress = mintAddressLog.match(regex)[1];

                        const tku = new TokenUtils();
                        const mintData = await tku.getTokenMetadata(mintAddress);

                        if (mintData.escrow === '0') {
                            mintData.escrow = lamportsToSol(tx.meta.preBalances[0] - tx.meta.postBalances[0]).toString();
                        }

                        voucherInfo = {
                            mintAddress: mintAddress,
                            name: mintData.name,
                            symbol: mintData.symbol,
                            isBurnt: false,
                            escrow: mintData.escrow,
                            escrowAddress: mintData.escrowAddress,
                            uri: mintData?.uri || FALLBACK_IMAGE_URL,
                            expiry: mintData.expiry,
                        };
                    } else {
                        if (tx.meta && tx.meta.logMessages) {
                            if (tx.meta.logMessages.some(log => log.includes("Instruction: CloseAccount"))) {
                                const mintAddress = tx.transaction.message.accountKeys[2].pubkey.toString();
                                const escrowAmount = lamportsToSol(tx.meta.postBalances[0] - tx.meta.preBalances[0]);

                                const tku = new TokenUtils();
                                const mintData = await tku.getTokenMetadata(mintAddress);

                                voucherInfo = {
                                    mintAddress: mintAddress,
                                    name: mintData.name,
                                    symbol: mintData.symbol,
                                    isBurnt: true,
                                    escrow: escrowAmount.toString(),
                                    escrowAddress: mintData.escrowAddress,
                                    uri: mintData?.uri || FALLBACK_IMAGE_URL,
                                    expiry: mintData.expiry,
                                };

                                if (voucherInfo.escrowAddress == 'Not found') {
                                    const altMintAddress = tx.transaction.message.accountKeys[1].pubkey.toString();
                                    const altMintData = await tku.getTokenMetadata(altMintAddress);
                                    voucherInfo = {
                                        mintAddress: altMintAddress,
                                        name: altMintData.name,
                                        symbol: altMintData.symbol,
                                        isBurnt: true,
                                        escrow: escrowAmount.toString(),
                                        escrowAddress: altMintData.escrowAddress,
                                        uri: altMintData?.uri || FALLBACK_IMAGE_URL,
                                        expiry: altMintData.expiry,
                                    };
                                }
                            }
                        }
                    }

                    if (voucherInfo) {
                        return {
                            signature,
                            timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
                            isCreateVoucher,
                            performer: tx.transaction.message.accountKeys[0].pubkey.toString(),
                            voucherInfo,
                        };
                    }
                    return null;
                })
            );

            setTransactions(transactionDetails.filter(Boolean) as Transaction[]);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            setLoading(false);
        }
    }, [signatures]);

    const fetchImagesAndConvertCurrency = useCallback(async () => {
        const newImageSrcs: { [key: string]: string } = {};
        const newConvertedValues: { [key: string]: number } = {};

        for (const tx of transactions) {
            if (tx.voucherInfo) {
                newImageSrcs[tx.signature] = tx.voucherInfo.uri || FALLBACK_IMAGE_URL;
                const escrowAmount = parseFloat(tx.voucherInfo.escrow);
                const convertedAmount = await CurrencyConverter.convertSolToCurrency(escrowAmount);
                newConvertedValues[tx.signature] = convertedAmount || 0;
            }
        }

        setImageSrcs(newImageSrcs);
        setConvertedValues(newConvertedValues);
        setCurrencySymbol(await CurrencyConverter.getCurrencySymbol());
    }, [transactions]);

    const handleImageError = useCallback((signature: string) => {
        setImageSrcs(prevState => ({
            ...prevState,
            [signature]: FALLBACK_IMAGE_URL
        }));
    }, []);

    const refreshTransactions = useCallback(async () => {
        setLoading(true);
        await fetchTransactions(1);
        await fetchImagesAndConvertCurrency();
        setLoading(false);
    }, [fetchTransactions, fetchImagesAndConvertCurrency]);

    useEffect(() => {
        fetchSignatures(); // Fetch signatures once when component mounts
    }, [fetchSignatures]);

    return {
        transactions,
        loading,
        imageSrcs,
        convertedValues,
        currencySymbol,
        fetchTransactions,
        fetchImagesAndConvertCurrency,
        refreshTransactions,
        handleImageError,
    };
};
