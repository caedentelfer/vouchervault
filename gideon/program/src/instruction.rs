use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankInstruction;

use crate::instructions::{escrow::InitEscrowArgs, mint::MintVoucherArgs};

#[derive(BorshDeserialize, BorshSerialize, Clone, Debug, ShankInstruction)]
#[rustfmt::skip]
pub enum GideonInstruction {
    #[account(0, writable, name = "mint_authority", desc = "The account of the authority PDA")]
    #[account(1, writable, name = "payer", desc = "The account to pay for the authority PDA")]
    #[account(2, name = "system_program", desc = "The system program account")]
    InitMintAuthority,

    #[account(0, writable, name = "escrow_account", desc = "The escrow account")]
    #[account(1, writable, signer, name = "payer", desc = "The account to pay for the mint")]
    #[account(2, writable, signer, name = "mint_account", desc = "The mint account to mint the NFT")]
    #[account(3, writable, name = "mint_authority", desc = "The authority over the mint")]
    #[account(4, writable, name = "associated_token_account", desc = "The associated token account")]
    #[account(5, name = "rent", desc = "The rent account")]
    #[account(6, name = "system_program", desc = "The system program account")]
    #[account(7, name = "token_program", desc = "The token program account")]
    #[account(8, name = "associated_token_program", desc = "The associated token program account")]
    InitEscrowAndMintVoucher(InitEscrowArgs, MintVoucherArgs),

    #[account(0, writable, signer, name = "payer", desc = "The account to pay for the burn")]
    #[account(1, writable, name = "ata", desc = "The associated token account")]
    #[account(2, writable, name = "mint_account", desc = "The mint account")]
    #[account(3, name = "mint_authority", desc = "The authority over the mint")]
    #[account(4, writable, name = "escrow_account", desc = "The escrow account")]
    #[account(5, name = "token_program", desc = "The token program account")]
    #[account(6, name = "clock_program", desc = "The clock program account")]
    #[account(7, name = "system_program", desc = "The system program account")]
    ReleaseEscrowAndBurnVoucher,

    #[account(0, writable, signer, name = "payer", desc = "The account to pay for the release")]
    #[account(1, writable, name = "escrow_account", desc = "The escrow account")]
    #[account(2, name = "mint_account", desc = "The mint account")]
    #[account(3, name = "clock_program", desc = "The clock program account")]
    ReleaseExpiredEscrow,
}
