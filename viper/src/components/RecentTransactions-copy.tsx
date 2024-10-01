import { ContentCopy, ExpandLess, ExpandMore } from '@mui/icons-material';
import { Button, Card, CardContent, CircularProgress, IconButton, List, ListItem, ListItemIcon, ListItemText, Paper, Tooltip, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useTransactions } from '../hooks/transactionHooks';

const PROGRAM_ID = 'gidsaNxwQbr6pyLDaqVn4pPwAypkjwFNZQvvKBJ1Rbi';
const FALLBACK_IMAGE_URL = "https://cdn-icons-png.flaticon.com/512/3514/3514447.png";

interface RecentTransactionsProps {
    refreshTrigger: number;
    onRefresh: () => void;
}
interface Company {
    name: string
    walletAddress: string
}

const RecentTransactions: React.FC = () => {
    const {
        transactions,
        loading,
        imageSrcs,
        convertedValues,
        currencySymbol,
        fetchTransactions,
        fetchImagesAndConvertCurrency,
        refreshTransactions,
        handleImageError,
    } = useTransactions();

    const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
    const [companies, setCompanies] = useState<Company[]>([])
    const [pageNumber, setPageNumber] = useState(1)

    useEffect(() => {
        fetchTransactions(1);
    }, [fetchTransactions]);

    useEffect(() => {
        if (transactions.length > 0) {
            fetchImagesAndConvertCurrency();
        }
    }, [transactions, fetchImagesAndConvertCurrency]);

    useEffect(() => {
        fetch('/api/CompanyWalletLoader')
            .then(response => response.json())
            .then(data => setCompanies(data))
            .catch(error => console.error('Error fetching company wallets:', error))

        console.log('COMPANIES:', companies)
    }, [])

    const getCompanyName = (address: string) => {
        const company = companies.find(company => company.walletAddress === address)
        return company ? company.name : 'Unknown'
    }

    const handleClick = (id: string) => {
        setExpandedTxId(expandedTxId === id ? null : id);
    };

    const handleNextPage = async () => {
        setPageNumber(pageNumber + 1)
        await fetchTransactions(pageNumber + 1)
    }

    const handlePreviousPage = async () => {
        setPageNumber(pageNumber - 1)
        await fetchTransactions(pageNumber - 1)
    }

    if (loading) {
        return (
            <Card style={{ maxWidth: 800, margin: '0 auto' }}>
                <CardContent>
                    <Typography variant="h5" component="div" gutterBottom>
                        Recent Transactions
                    </Typography>
                    <List>
                        <Paper
                            style={{
                                marginBottom: '0.5rem',
                                padding: '1rem',
                                transition: 'all 0.3s ease',
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                backgroundColor: '#f9f9f9',
                                boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.1)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                height: '100px',
                            }}
                        >
                            <CircularProgress />
                        </Paper>
                    </List>
                </CardContent>
            </Card>
        );
    }

    const CopyButton = ({ text }) => {
        const [copied, setCopied] = useState(false);

        const handleCopy = async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        };

        return (
            <Tooltip title={copied ? "Copied!" : "Copy Address"}>
                <IconButton onClick={handleCopy} size="small">
                    <ContentCopy fontSize="small" color={copied ? "primary" : "action"} />
                </IconButton>
            </Tooltip>
        );
    };

    const AddressDisplay = ({ label, value }) => (
        <>
            <Typography style={{ fontSize: '1rem', marginTop: '1rem', fontWeight: 'bold' }}>{label}:</Typography>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <Typography style={{ marginRight: '0.5rem' }}>{value}</Typography>
                <CopyButton text={value} />
            </div>
        </>
    );

    return (
        <Card style={{ maxWidth: 800, margin: '0 auto' }}>
            <CardContent>
                <Typography variant="h5" component="div" gutterBottom>
                    Recent Transactions
                </Typography>
                <List>
                    {transactions.map((tx) => (
                        <Paper
                            key={tx.signature}
                            style={{
                                marginBottom: '0.5rem',
                                padding: '1rem',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer',
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                backgroundColor: '#f9f9f9',
                                boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.1)',
                            }}
                        >
                            <ListItem
                                button
                                onClick={() => handleClick(tx.signature)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: 0,
                                }}
                            >
                                <IconButton edge="start" onClick={() => handleClick(tx.signature)}>
                                    {expandedTxId === tx.signature ? <ExpandLess /> : <ExpandMore />}
                                </IconButton>
                                {tx.voucherInfo && (
                                    <ListItemIcon>
                                        <img
                                            src={imageSrcs[tx.signature] || FALLBACK_IMAGE_URL}
                                            alt={tx.voucherInfo.name}
                                            onError={() => handleImageError(tx.signature)}
                                            style={{
                                                width: 60,
                                                height: 60,
                                                objectFit: 'cover',
                                                borderRadius: '8px',
                                                marginRight: '16px',
                                            }}
                                        />
                                    </ListItemIcon>
                                )}
                                <ListItemText
                                    primary={
                                        <Typography variant="subtitle1"  >
                                            <b>{tx.isCreateVoucher ? 'Create Voucher' : 'Redeem Voucher'}</b>
                                        </Typography>
                                    }
                                    secondary={
                                        <>
                                            <Typography component="span" variant="body2" color="text.primary">
                                                Performed by: {tx.performer}
                                            </Typography>
                                            <br />
                                            <Typography component="span" variant="body2">
                                                Date: {new Date(tx.timestamp).toLocaleString()}
                                            </Typography>
                                        </>
                                    }
                                />
                                {tx.voucherInfo && (
                                    <Typography variant="h6" style={{ marginLeft: 'auto', fontSize: '1.25rem' }}>
                                        {currencySymbol}{convertedValues[tx.signature]?.toFixed(2) || 'Loading...'}
                                    </Typography>
                                )}
                            </ListItem>
                            {expandedTxId === tx.signature && tx.voucherInfo && (
                                <div style={{ marginTop: '1rem' }}>
                                    <Typography style={{ fontWeight: 'bold' }}>VOUCHER:</Typography>
                                    <Typography variant="h6">{tx.voucherInfo.name} ({tx.voucherInfo.symbol})</Typography>
                                    <AddressDisplay label="MINT ADDRESS" value={tx.voucherInfo.mintAddress} />
                                    <AddressDisplay label="ESCROW ADDRESS" value={tx.voucherInfo.escrowAddress} />
                                    <Typography style={{ fontSize: '1rem', marginTop: '1rem', fontWeight: 'bold' }}>STATUS:</Typography>
                                    <Typography>{tx.voucherInfo.isBurnt ? 'Burnt' : 'Active'}</Typography>
                                    <AddressDisplay label="USER" value={tx.performer} />
                                    {/* Conditionally render the COMPANY field */}
                                    {getCompanyName(tx.performer) !== 'Unknown' && (
                                        <AddressDisplay
                                            label="COMPANY"
                                            value={getCompanyName(tx.performer)}
                                        />
                                    )}
                                    {/* Conditionally render the EXPIRY field */}
                                    {tx.voucherInfo.expiry !== 0 && (
                                        <div>
                                            <Typography style={{ fontSize: '1rem', marginTop: '1rem', fontWeight: 'bold' }}>EXPIRY:</Typography>
                                            <Typography>{new Date(tx.voucherInfo.expiry).toLocaleString()}</Typography>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Paper>
                    ))}
                </List>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                    {pageNumber !== 1 && (
                        <Button
                            variant="contained"
                            style={{
                                backgroundColor: '#82b6cf',
                                color: '#fff',
                            }}
                            onClick={handlePreviousPage}
                        >
                            Previous Page
                        </Button>
                    )}
                    {pageNumber !== 5 && (
                        <Button
                            variant="contained"
                            style={{
                                backgroundColor: '#82b6cf',
                                color: '#fff',
                                marginLeft: 'auto', // Ensure this button stays to the right
                            }}
                            onClick={handleNextPage}
                        >
                            Next Page
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default RecentTransactions;
