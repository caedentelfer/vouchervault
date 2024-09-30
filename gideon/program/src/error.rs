use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone)]
pub enum GideonError {
    /// Invalid instruction
    #[error("Invalid Instruction")]
    InvalidInstruction,

    /// Invalid mint authority
    #[error("Invalid Mint Authority")]
    InvalidMintAuthority,

    /// Invalid recipient account
    #[error("Invalid Recipient Account")]
    InvalidRecipientAccount,

    /// Insufficient funds
    #[error("Insufficient Funds")]
    InsufficientFunds,

    /// Invalid voucher escrow account
    #[error("Invalid Voucher Escrow Account")]
    InvalidVoucherEscrowAccount,

    /// Voucher expired
    #[error("Voucher Expired")]
    VoucherExpired,
}

impl From<GideonError> for ProgramError {
    fn from(e: GideonError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
