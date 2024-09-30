use solana_program::{
    account_info::{next_account_info, AccountInfo},
    borsh1::try_from_slice_unchecked,
    clock::Clock,
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    pubkey::Pubkey,
    sysvar::Sysvar,
};
use spl_token_2022::{
    extension::{BaseStateWithExtensions, StateWithExtensions},
    instruction as token_instruction,
    state::Mint,
};
use spl_token_metadata_interface::state::TokenMetadata;

use crate::{
    error::GideonError,
    state::{authority::MintAuthorityPda, escrow::Escrow},
};

pub fn burn_voucher_release_escrow(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();

    let payer = next_account_info(accounts_iter)?;
    let ata = next_account_info(accounts_iter)?;
    let mint_account = next_account_info(accounts_iter)?;
    let mint_authority = next_account_info(accounts_iter)?;
    let escrow_account = next_account_info(accounts_iter)?;
    let token_program = next_account_info(accounts_iter)?;
    let clock_program = next_account_info(accounts_iter)?;
    let _ = next_account_info(accounts_iter)?;

    let (mint_authority_pda, bump) =
        Pubkey::find_program_address(&[MintAuthorityPda::SEED_PREFIX.as_bytes()], program_id);

    // Check mint authority
    if mint_authority.key != &mint_authority_pda {
        msg!("Invalid mint authority account");
        return Err(GideonError::InvalidMintAuthority.into());
    }

    // Check mint authority bump
    let mint_authority_data =
        try_from_slice_unchecked::<MintAuthorityPda>(&mint_authority.data.borrow()).unwrap();
    if mint_authority_data.bump != bump {
        msg!("Invalid mint authority account");
        return Err(GideonError::InvalidMintAuthority.into());
    }
    drop(mint_authority_data);

    // Check escrow recipient
    let escrow_data = escrow_account.data.borrow();
    let escrow = try_from_slice_unchecked::<Escrow>(&escrow_data).unwrap();
    if escrow.recipient != *payer.key {
        msg!("Invalid payer account");
        return Err(GideonError::InvalidRecipientAccount.into());
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
        if clock.unix_timestamp > voucher_expiry {
            msg!("Voucher expired");
            return Err(GideonError::VoucherExpired.into());
        }

        drop(mint_data);
    }

    // Check voucher ownership
    // TODO: Implement this

    // Burn voucher
    invoke_signed(
        &token_instruction::burn_checked(
            token_program.key,
            ata.key,
            mint_account.key,
            payer.key,
            &[payer.key],
            1,
            0,
        )?,
        &[
            ata.clone(),
            mint_account.clone(),
            mint_authority.clone(),
            payer.clone(),
        ],
        &[&[MintAuthorityPda::SEED_PREFIX.as_bytes(), &[bump]]],
    )?;

    // Close ATA account
    if ata.lamports() > 0 {
        invoke(
            &token_instruction::close_account(
                token_program.key,
                ata.key,
                payer.key,
                payer.key,
                &[payer.key],
            )?,
            &[ata.clone(), payer.clone(), token_program.clone()],
        )?;
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
