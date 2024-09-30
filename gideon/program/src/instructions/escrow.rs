use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    borsh1::try_from_slice_unchecked,
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};

use crate::state::escrow::Escrow;

#[derive(BorshDeserialize, BorshSerialize, Clone, Debug)]
pub struct InitEscrowArgs {
    pub payer: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub voucher_mint: Pubkey,
}

pub fn init_escrow(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    args: InitEscrowArgs,
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();

    let escrow_account = next_account_info(accounts_iter)?;
    let payer = next_account_info(accounts_iter)?;
    let _mint_account = next_account_info(accounts_iter)?;
    let _mint_authority = next_account_info(accounts_iter)?;
    let _associated_token_account = next_account_info(accounts_iter)?;
    let _rent = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;
    let _token_program = next_account_info(accounts_iter)?;
    let _associated_token_program = next_account_info(accounts_iter)?;

    let (_escrow_pda, escrow_bump) = Pubkey::find_program_address(
        &[
            Escrow::SEED_PREFIX.as_bytes(),
            args.payer.as_ref(),
            args.recipient.as_ref(),
            args.voucher_mint.as_ref(),
        ],
        program_id,
    );

    let lamports_required = Rent::get()?.minimum_balance(Escrow::ACCOUNT_SPACE);

    let create_account_instruction = system_instruction::create_account(
        payer.key,
        escrow_account.key,
        lamports_required,
        Escrow::ACCOUNT_SPACE as u64,
        program_id,
    );

    msg!("Creating escrow account");
    invoke_signed(
        &create_account_instruction,
        &[
            escrow_account.clone(),
            payer.clone(),
            system_program.clone(),
        ],
        &[&[
            Escrow::SEED_PREFIX.as_bytes(),
            args.payer.as_ref(),
            args.recipient.as_ref(),
            args.voucher_mint.as_ref(),
            &[escrow_bump],
        ]],
    )?;

    // Set the escrow account data
    msg!("Setting escrow account data");
    let mut account_data =
        try_from_slice_unchecked::<Escrow>(&escrow_account.data.borrow()).unwrap();

    account_data.payer = args.payer;
    account_data.recipient = args.recipient;
    account_data.amount = args.amount;
    account_data.bump = escrow_bump;
    account_data.voucher_mint = args.voucher_mint;

    account_data.serialize(&mut &mut escrow_account.data.borrow_mut()[..])?;

    // Invoke transfer to move the funds to the escrow account
    msg!("Transferring funds to escrow account");
    invoke(
        &system_instruction::transfer(&args.payer, escrow_account.key, args.amount),
        &[
            payer.clone(),
            escrow_account.clone(),
            system_program.clone(),
        ],
    )?;

    Ok(())
}
