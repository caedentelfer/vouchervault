import { useState, useCallback, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { CurrencyConverter } from '../../utils/CurrencyConverter';
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
    transactionSignature: string;
    date: string;
    source: string;
    destination: string;
    amount: number;
    success: boolean;
    mintAddress: string;
    voucherName: string;
    voucherSymbol: string;
    voucherUri: string;
}

const extractTransferInfo = async (connection: Connection, mintAddress: string): Promise<Transfer[]> => {
    const mint = new PublicKey(mintAddress);
    const signatures = await connection.getSignaturesForAddress(mint, { limit: 10 });
    const transfers: Transfer[] = [];

    const tku = new TokenUtils();
    const mintData = await tku.getTokenMetadata(mintAddress);

    for (const sigInfo of signatures) {
        const tx = await connection.getParsedTransaction(sigInfo.signature);
        
        if (tx && tx.transaction.message.instructions) {
            const splTokenInstruction = tx.transaction.message.instructions.find(
                (instruction) => 'program' in instruction && instruction.program === 'spl-token'
            );

            if (splTokenInstruction && 'parsed' in splTokenInstruction) {
                const { type, info } = splTokenInstruction.parsed;

                if (type === 'transfer' && info) {
                    const date = new Date(sigInfo.blockTime! * 1000);
                    const saTimeOptions: Intl.DateTimeFormatOptions = {
                        timeZone: 'Africa/Johannesburg',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                    };
                    const saFormattedDate = new Intl.DateTimeFormat('en-ZA', saTimeOptions).format(date);

                    const transfer: Transfer = {
                        transactionSignature: sigInfo.signature,
                        date: saFormattedDate,
                        source: info.source,
                        destination: info.destination,
                        amount: Number(info.amount),
                        success: tx.meta?.err === null,
                        mintAddress: mintAddress,
                        voucherName: mintData.name,
                        voucherSymbol: mintData.symbol,
                        voucherUri: mintData.uri || FALLBACK_IMAGE_URL,
                    };

                    transfers.push(transfer);
                }
            }
        }
    }

    return transfers;
};

export const useTransfers = (itemsPerPage: number = 10) => {
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [imageSrcs, setImageSrcs] = useState<{ [key: string]: string }>({});
    const [convertedValues, setConvertedValues] = useState<{ [key: string]: number }>({});
    const [currencySymbol, setCurrencySymbol] = useState('R');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchTransfers = useCallback(async (page: number) => {
        setLoading(true);

        try {
            const rpcManager = RPCManager.getInstance();
            const connection = rpcManager.getNextConnection();
            const programId = new PublicKey(PROGRAM_ID);

            const allSignatures = await connection.getSignaturesForAddress(programId, { limit: 100 });
            const totalTransfers = allSignatures.length;
            setTotalPages(Math.ceil(totalTransfers / itemsPerPage));

            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const pageSignatures = allSignatures.slice(startIndex, endIndex);

            const allTransfers: Transfer[] = [];

            for (const sigInfo of pageSignatures) {
                const tx = await connection.getParsedTransaction(sigInfo.signature);
                if (tx && tx.meta && tx.meta.logMessages) {
                    const mintAddressLog = tx.meta.logMessages.find(log => log.includes("Program log: Mint:"));
                    if (mintAddressLog) {
                        const regex = /Mint:\s([A-Za-z0-9]+)/;
                        const mintAddress = mintAddressLog.match(regex)?.[1];
                        if (mintAddress) {
                            const transfersForMint = await extractTransferInfo(connection, mintAddress);
                            allTransfers.push(...transfersForMint);
                        }
                    }
                }
            }

            setTransfers(allTransfers);
            setCurrentPage(page);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching transfers:', error);
            setLoading(false);
        }
    }, [itemsPerPage]);

    const fetchImagesAndConvertCurrency = useCallback(async () => {
        const newImageSrcs: { [key: string]: string } = {};
        const newConvertedValues: { [key: string]: number } = {};

        for (const transfer of transfers) {
            newImageSrcs[transfer.transactionSignature] = transfer.voucherUri;
            const convertedAmount = await CurrencyConverter.convertSolToCurrency(transfer.amount / 1e9);
            newConvertedValues[transfer.transactionSignature] = convertedAmount || 0;
        }

        setImageSrcs(newImageSrcs);
        setConvertedValues(newConvertedValues);
        setCurrencySymbol(await CurrencyConverter.getCurrencySymbol());
    }, [transfers]);

    const handleImageError = useCallback((signature: string) => {
        setImageSrcs(prevState => ({
            ...prevState,
            [signature]: FALLBACK_IMAGE_URL
        }));
    }, []);

    const refreshTransfers = useCallback(async () => {
        setLoading(true);
        await fetchTransfers(1);
        await fetchImagesAndConvertCurrency();
        setLoading(false);
    }, [fetchTransfers, fetchImagesAndConvertCurrency]);

    useEffect(() => {
        fetchTransfers(1);
    }, [fetchTransfers]);

    useEffect(() => {
        if (transfers.length > 0) {
            fetchImagesAndConvertCurrency();
        }
    }, [transfers, fetchImagesAndConvertCurrency]);

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            fetchTransfers(page);
        }
    };

    return {
        transfers,
        loading,
        imageSrcs,
        convertedValues,
        currencySymbol,
        currentPage,
        totalPages,
        refreshTransfers,
        handleImageError,
        goToPage,
    };
};