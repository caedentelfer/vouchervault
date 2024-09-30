use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

#[derive(BorshDeserialize, BorshSerialize, Clone, Debug)]
pub struct Escrow {
    pub payer: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub bump: u8,
    pub voucher_mint: Pubkey,
}

impl Escrow {
    pub const ACCOUNT_SPACE: usize = 32 + 32 + 16 + 1 + 32;

    pub const SEED_PREFIX: &'static str = "escrow";

    pub fn new(payer: Pubkey, recipient: Pubkey, amount: u64, bump: u8, voucher_mint: Pubkey) -> Self {
        Self {
            payer,
            recipient,
            amount,
            bump,
            voucher_mint,
        }
    }
}