// Interface for VoucherData objects
// used to populate VoucherList objects (inside comonents/VoucherList.tsx)
export interface VoucherData {
    mintAddress: string;
    name: string;
    symbol: string;
    description: string;
    uri: string;
    escrow: string;
    escrowAddress: string;
    expiry: number;
}
