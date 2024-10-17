use solana_program::{
    account_info::{next_account_info, AccountInfo},
    borsh1::try_from_slice_unchecked,
    clock::Clock,
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
    sysvar::Sysvar,
};
use spl_token_2022::{
    extension::{BaseStateWithExtensions, StateWithExtensions},
    state::Mint,
};
use spl_token_metadata_interface::state::TokenMetadata;

use crate::{error::GideonError, state::escrow::Escrow};

pub fn release_expired_escrow(accounts: &[AccountInfo]) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();

    let payer = next_account_info(accounts_iter)?;
    let escrow_account = next_account_info(accounts_iter)?;
    let mint_account = next_account_info(accounts_iter)?;
    let clock_program = next_account_info(accounts_iter)?;

    // Check escrow recipient
    let escrow_data = escrow_account.data.borrow();
    let escrow = try_from_slice_unchecked::<Escrow>(&escrow_data).unwrap();
    if escrow.payer != *payer.key {
        msg!("Invalid payer account");
        return Err(GideonError::InvalidIssuer.into());
    }
    drop(escrow_data);

    // Get token metadata
    {
        let mint_data = mint_account.try_borrow_data()?;
        let mint = StateWithExtensions::<Mint>::unpack(&mint_data)?;
        let metadata_bytes = mint.get_extension_bytes::<TokenMetadata>()?;
        let metadata = try_from_slice_unchecked::<TokenMetadata>(&metadata_bytes).unwrap();

        // Check voucher escrow link
        let voucher_escrow_address = metadata
            .additional_metadata
            .iter()
            .find(|(key, _)| key == "escrow")
            .map(|(_, value)| value.parse::<Pubkey>().unwrap())
            .unwrap();
        if voucher_escrow_address != *escrow_account.key {
            msg!("Invalid voucher escrow account");
            return Err(GideonError::InvalidVoucherEscrowAccount.into());
        }

        // Check voucher expiry
        let voucher_expiry = metadata
            .additional_metadata
            .iter()
            .find(|(key, _)| key == "expiry")
            .map(|(_, value)| value.parse::<i64>().unwrap())
            .unwrap()
            / 1000;
        let clock = Clock::from_account_info(clock_program)?;
        if clock.unix_timestamp < voucher_expiry {
            msg!("Voucher not expired");
            return Err(GideonError::VoucherNotExpired.into());
        }

        drop(mint_data);
    }

    // Transfer lamports from escrow to payer and close escrow account
    let payer_lamports = payer.lamports();
    **payer.lamports.borrow_mut() = payer_lamports
        .checked_add(escrow_account.lamports())
        .unwrap();
    **escrow_account.lamports.borrow_mut() = 0;

    // Clear escrow account data
    let mut escrow_data = escrow_account.data.borrow_mut();
    escrow_data.fill(0);

    Ok(())
}
