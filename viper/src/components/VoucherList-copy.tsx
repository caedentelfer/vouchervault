import React, { useState, useEffect } from 'react';
import { Paper, List, ListItem, ListItemIcon, ListItemText, Typography, IconButton, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions, CircularProgress } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { CurrencyConverter } from '../utils/CurrencyConverter';
import {
    WalletNotConnectedError,
    SignerWalletAdapterProps
} from '@solana/wallet-adapter-base';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
    createTransferInstruction,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
    getAccount,
    TOKEN_2022_PROGRAM_ID
} from '@solana/spl-token';
import {
    PublicKey,
    Transaction,
    Connection,
    TransactionInstruction
} from '@solana/web3.js';
import { set } from 'date-fns';


/**
 * @author Caeden, David
 * 
 * @brief VoucherList component to display a list of vouchers
 * 
 * @param vouchers List of vouchers to display
 * @param userType Type of user: 'payer' | 'receiver' | 'provider'
 * 
 * @returns VoucherList component, populated with a User's vouchers
 */

interface VoucherData {
    expiry: number;
    mintAddress: string;
    name: string;
    symbol: string;
    description: string;
    uri: string;
    escrow: string;
    escrowAddress: string;
}

let currencySymbol = 'R'; // Default currency symbol
let currCountry = 'Not selected';

interface VoucherListProps {
    vouchers: VoucherData[];
    userType: 'payer' | 'receiver' | 'provider';
    onBurnAndReceive?: (voucherId: string, escrowAccount: string) => void;
    onVoucherTransferred?: (mintAddress: string) => void;
    onRedeem?: (voucher: VoucherData) => void;
}

const FALLBACK_IMAGE_URL = "https://cdn-icons-png.flaticon.com/512/3514/3514447.png"; // Default voucher icon

const VoucherList: React.FC<VoucherListProps> = ({ vouchers, userType, onRedeem, onVoucherTransferred }) => {
    const [expandedVoucherId, setExpandedVoucherId] = useState<string | null>(null);
    const [imageSrcs, setImageSrcs] = useState<string[]>([]);
    const [convertedValues, setConvertedValues] = useState<Map<string, number>>(new Map());
    const [openDialog, setOpenDialog] = useState<boolean>(false);  // Dialog open state
    const [selectedVoucher, setSelectedVoucher] = useState<VoucherData | null>(null);  // Selected voucher
    const [walletAddress, setWalletAddress] = useState<string>('');  // Wallet address for transfer
    const { publicKey, signTransaction } = useWallet();
    const [busySending, setBusySending] = useState(false);
    const [openSuccessDialog, setOpenSuccessDialog] = useState(false);


    useEffect(() => {
        const initialImageSrcs = vouchers.map(voucher => voucher.uri || FALLBACK_IMAGE_URL);
        setImageSrcs(initialImageSrcs);
    }, [vouchers]);

    useEffect(() => {
        // Convert SOL to currency for all vouchers
        const convertAllVouchers = async () => {
            const newConvertedValues = new Map<string, number>();

            for (const voucher of vouchers) {
                const escrowAmount = parseFloat(voucher.escrow);
                const convertedAmount = await CurrencyConverter.convertSolToCurrency(escrowAmount);
                newConvertedValues.set(voucher.mintAddress, convertedAmount || 0);
            }

            currencySymbol = await CurrencyConverter.getCurrencySymbol();

            setConvertedValues(newConvertedValues);
        };

        convertAllVouchers();
    }, [vouchers]);

    useEffect(() => {
        // Polling logic to check for changes in the API every second
        const intervalId = setInterval(async () => {
            let country = await CurrencyConverter.getSelectedCountry();

            if (currCountry != country) {
                currCountry = country;


                const newConvertedValues = new Map<string, number>();

                for (const voucher of vouchers) {
                    const escrowAmount = parseFloat(voucher.escrow);
                    const convertedAmount = await CurrencyConverter.convertSolToCurrency(escrowAmount);
                    newConvertedValues.set(voucher.mintAddress, convertedAmount || 0);
                }

                currencySymbol = await CurrencyConverter.getCurrencySymbol();

                setConvertedValues(newConvertedValues);
            }


        }, 1000); // Check every second for changes in country (to update the currency)

        return () => clearInterval(intervalId);
    }, [vouchers]);

    const handleClick = (id: string) => {
        setExpandedVoucherId(expandedVoucherId === id ? null : id);
    };

    // Handle image errors
    const handleImageError = (index: number) => {
        setImageSrcs(prevState => {
            const updatedState = [...prevState];
            updatedState[index] = FALLBACK_IMAGE_URL;
            return updatedState;
        });
    };

    // Open the transfer dialog
    const handleOpenTransferDialog = (voucher: VoucherData) => {
        setSelectedVoucher(voucher);
        setOpenDialog(true);
    };

    const handleTransfer = async () => {
        setBusySending(true);
        if (!walletAddress || !selectedVoucher || !publicKey || !signTransaction) {
            console.error("Wallet not connected or voucher not selected");
            return;
        }

        try {
            const mintAddress = new PublicKey(selectedVoucher.mintAddress);
            const recipientAddress = new PublicKey(walletAddress);

            // Get connection to devnet
            const connection = new Connection('https://api.devnet.solana.com');

            console.log('1. Attempting to transfer voucher with: ', mintAddress.toString(), publicKey.toString(), recipientAddress.toString());

            const fromTokenAccount = await getAssociatedTokenAddress(
                mintAddress,
                publicKey,
                false,
                TOKEN_2022_PROGRAM_ID
            );

            console.log('2. fromTokenAccount: ', fromTokenAccount.toString());

            const toTokenAccount = await getAssociatedTokenAddress(
                mintAddress,
                recipientAddress,
                false,
                TOKEN_2022_PROGRAM_ID
            );

            console.log('3. toTokenAccount: ', toTokenAccount.toString());

            const instructions: TransactionInstruction[] = [];

            // Check if the recipient's token account exists
            const receiverAccount = await connection.getAccountInfo(toTokenAccount);
            if (!receiverAccount) {
                console.log('4. Creating associated token account for recipient');
                instructions.push(
                    createAssociatedTokenAccountInstruction(
                        publicKey,
                        toTokenAccount,
                        recipientAddress,
                        mintAddress,
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            // Add transfer instruction
            instructions.push(
                createTransferInstruction(
                    fromTokenAccount,
                    toTokenAccount,
                    publicKey,
                    1,  // amount to transfer
                    [],
                    TOKEN_2022_PROGRAM_ID
                )
            );

            console.log('5. Creating transaction');
            const transaction = new Transaction().add(...instructions);

            console.log('6. Configuring and sending transaction');
            const signature = await configureAndSendCurrentTransaction(
                transaction,
                connection,
                publicKey,
                signTransaction
            );

            console.log(`Transferred voucher ${mintAddress} to wallet ${recipientAddress.toString()} with signature: ${signature}`);

            // TODO something like this 
            // vouchers = prevVouchers => prevVouchers.filter(v => v.mintAddress !== mintAddress);
            onVoucherTransferred(selectedVoucher.mintAddress);

            setOpenSuccessDialog(true);

        } catch (error) {
            console.error("Failed to transfer voucher", error);
        } finally {
            setBusySending(false);
            setWalletAddress('');  // Reset wallet input
        }
        setOpenDialog(false);
    };

    const configureAndSendCurrentTransaction = async (
        transaction: Transaction,
        connection: Connection,
        feePayer: PublicKey,
        signTransaction: SignerWalletAdapterProps['signTransaction']
    ) => {
        try {
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            transaction.feePayer = feePayer;
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;

            console.log('7. Signing transaction');
            const signed = await signTransaction(transaction);

            console.log('8. Sending raw transaction');
            const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: true });

            console.log('9. Confirming transaction');
            await connection.confirmTransaction({
                blockhash,
                lastValidBlockHeight,
                signature
            });

            console.log(`Transaction confirmed with signature: ${signature}`);
            return signature;
        } catch (error) {
            console.error("Failed to send transaction", error);
            throw error;
        }
    };


    return (
        <Paper
            style={{
                width: '800px', // Fixed width for the list container
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                overflowX: 'auto',
                margin: '0 auto', // Center horizontally
            }}
        >
            {vouchers.length === 0 ? (
                <Typography variant="h6" align="center">No vouchers in wallet</Typography>
            ) : (
                <List>
                    {vouchers.map((voucher, index) => {
                        const escrowAmount = parseFloat(voucher.escrow);
                        const convertedAmount = convertedValues.get(voucher.mintAddress);

                        return (
                            <div key={voucher.mintAddress}>
                                <ListItem
                                    button
                                    onClick={() => handleClick(voucher.mintAddress)}
                                    style={{
                                        marginBottom: '0.5rem',
                                        padding: '1rem',
                                        transition: 'all 0.3s ease',
                                        transform: expandedVoucherId === voucher.mintAddress ? 'scale(1.05)' : 'scale(1)',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        backgroundColor: '#f9f9f9',
                                        boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.1)',
                                        width: '100%', // Full width of the container
                                        height: 80,
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <IconButton
                                        edge="start"
                                        onClick={() => handleClick(voucher.mintAddress)}
                                        style={{
                                            position: 'absolute',
                                            left: 10,
                                            zIndex: 1,
                                        }}
                                    >
                                        {expandedVoucherId === voucher.mintAddress ? <ExpandLess /> : <ExpandMore />}
                                    </IconButton>
                                    <ListItemIcon>
                                        <img
                                            src={imageSrcs[index] || FALLBACK_IMAGE_URL}
                                            alt={voucher.name}
                                            onError={() => handleImageError(index)}
                                            style={{
                                                width: 60,
                                                height: 60,
                                                objectFit: 'cover',
                                                borderRadius: '4px',
                                            }}
                                        />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={<Typography variant="h6" style={{ marginLeft: '1rem' }}>{voucher.name}</Typography>}
                                        secondary={<Typography variant="body2" style={{ marginLeft: '1rem' }}>{voucher.symbol}</Typography>}
                                        style={{ marginLeft: '1rem' }}
                                    />
                                    <Typography variant="h6" style={{ position: 'absolute', right: 60, fontSize: '1.25rem' }}>
                                        {convertedAmount !== undefined ? `${currencySymbol}${convertedAmount.toFixed(2)}` : 'Loading...'}
                                    </Typography>
                                </ListItem>
                                {expandedVoucherId === voucher.mintAddress && (
                                    <Paper
                                        style={{
                                            padding: '1rem',
                                            marginBottom: '0.5rem',
                                            borderRadius: '8px',
                                            backgroundColor: '#fff',
                                            boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.1)',
                                            position: 'relative',
                                            paddingBottom: '80px',
                                        }}
                                    >
                                        <Typography variant="h5" style={{ fontWeight: 'bold' }}>{voucher.name}</Typography>
                                        <Typography style={{ fontSize: '1.2rem', marginTop: '0rem', fontWeight: 'bold' }}>{voucher.symbol}</Typography>
                                        <Typography>&#8203;</Typography>
                                        <Typography variant="h6">{voucher.escrow} SOL</Typography>
                                        <Typography>&#8203;</Typography>
                                        <Typography style={{ fontSize: '1rem', marginTop: '1rem', fontWeight: 'bold' }}>DESCRIPTION:</Typography>
                                        <Typography>{voucher.description}</Typography>
                                        <Typography style={{ fontSize: '1rem', marginTop: '1rem', fontWeight: 'bold' }}>ESCROW ACCOUNT:</Typography>
                                        <Typography>{voucher.escrowAddress}</Typography>
                                        <Typography style={{ fontSize: '1rem', marginTop: '1rem', fontWeight: 'bold' }}>VOUCHER MINT ADDRESS:</Typography>
                                        <Typography>{voucher.mintAddress}</Typography>
                                        {voucher.expiry > 0 && (
                                            <div>
                                                <Typography style={{ fontSize: '1rem', marginTop: '1rem', fontWeight: 'bold' }}>EXPIRY:</Typography>
                                                <Typography>{new Date(voucher.expiry).toLocaleString()}</Typography>
                                            </div>
                                        )}
                                        <img
                                            src={imageSrcs[index] || FALLBACK_IMAGE_URL}
                                            alt={voucher.name}
                                            onError={() => handleImageError(index)}
                                            style={{
                                                width: 200,
                                                height: 200,
                                                objectFit: 'cover',
                                                borderRadius: '8px',
                                                position: 'absolute',
                                                right: 20,
                                                top: 20,
                                            }}
                                        />
                                        {userType === 'receiver' && (
                                            <Button
                                                variant="contained"
                                                color="success"
                                                style={{
                                                    position: 'absolute',
                                                    bottom: 20,
                                                    right: 20,
                                                    width: '96%',
                                                }}
                                                onClick={() => onRedeem(voucher)} // Call the redeem function passed from the dashboard
                                            >
                                                Redeem
                                            </Button>
                                        )}
                                        {userType === 'provider' && (
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                style={{
                                                    position: 'absolute',
                                                    bottom: 20,
                                                    right: 20,
                                                    width: '96%',
                                                }}
                                            >
                                                BURN & RECEIVE SOL
                                            </Button>
                                        )}
                                        {userType === 'payer' && (
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={() => handleOpenTransferDialog(voucher)}
                                                style={{
                                                    position: 'absolute',
                                                    bottom: 20,
                                                    right: 20,
                                                    width: '96%',
                                                }
                                                }
                                            >
                                                Transfer
                                            </Button>
                                        )}
                                    </Paper>
                                )}
                            </div>
                        );
                    })}
                </List>
            )}
            {/* Dialog for entering the wallet address */}
            <Dialog open={openDialog} onClose={() => !busySending && setOpenDialog(false)}>
                <DialogTitle>Transfer Voucher</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Recipient Wallet Address"
                        fullWidth
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        disabled={busySending}
                        style={{ marginTop: '20px' }}
                    />
                    {busySending && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                            <CircularProgress />
                        </div>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)} color="secondary" disabled={busySending}>
                        Cancel
                    </Button>
                    <Button onClick={handleTransfer} color="primary" disabled={busySending}>
                        Transfer
                    </Button>
                </DialogActions>
            </Dialog>
            {/* Dialog for successful transfer */}
            <Dialog open={openSuccessDialog} onClose={() => setOpenSuccessDialog(false)}>
                <DialogTitle>Transfer Successful</DialogTitle>
                <DialogContent>
                    <Typography>Voucher has been successfully transferred to the recipient.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenSuccessDialog(false)} color="primary">
                        OK
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>

    );
};

export default VoucherList;
