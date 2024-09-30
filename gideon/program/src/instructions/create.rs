use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::invoke,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};
use spl_token_2022::{
    extension::{metadata_pointer::instruction as metadata_pointer_instruction, ExtensionType},
    instruction as token_instruction,
    state::Mint,
};
use spl_token_metadata_interface::instruction as metadata_instruction;

#[derive(BorshSerialize, BorshDeserialize, Clone, Debug)]
pub struct CreateVoucherArgs {
    pub voucher_title: String,
    pub voucher_description: String,
    pub voucher_symbol: String,
    pub voucher_uri: String,
}

pub fn create_voucher(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    args: CreateVoucherArgs,
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();

    let mint_account = next_account_info(accounts_iter)?;
    let mint_authority = next_account_info(accounts_iter)?;
    let payer = next_account_info(accounts_iter)?;
    let rent = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;
    let token_program = next_account_info(accounts_iter)?;

    let space =
        ExtensionType::try_calculate_account_len::<Mint>(&[ExtensionType::MetadataPointer])?;

    let meta_data_space = 250;

    // Get the required rent exemption amount for the account
    let rent_required = Rent::get()?.minimum_balance(space + meta_data_space);

    // First create account for the Mint
    msg!("Creating mint account...");
    msg!("Mint: {}", mint_account.key);

    // Invoke cross-program invocation to create mint account
    invoke(
        &system_instruction::create_account(
            payer.key,
            mint_account.key,
            rent_required,
            space as u64,
            token_program.key,
        ),
        &[
            mint_account.clone(),
            payer.clone(),
            system_program.clone(),
            token_program.clone(),
        ],
    )?;

    // Now create the account for that Mint's metadata
    // TODO: Figure out
    invoke(
        &metadata_pointer_instruction::initialize(
            token_program.key,
            mint_account.key,
            Some(*mint_authority.key),
            Some(*mint_account.key), // Use mint_account as metadata account
        )?,
        &[
            mint_account.clone(),
            mint_authority.clone(),
            token_program.clone(),
        ],
    )?;

    // Initialize that account as a Mint
    msg!("Initializing mint account...");
    msg!("Mint: {}", mint_account.key);

    invoke(
        &token_instruction::initialize_mint(
            token_program.key,
            mint_account.key,
            mint_authority.key,
            Some(mint_authority.key),
            0, // 0 Decimals for the NFT standard
        )?,
        &[
            mint_account.clone(),
            mint_authority.clone(),
            token_program.clone(),
            rent.clone(),
        ],
    )?;

    invoke(
        &metadata_instruction::initialize(
            token_program.key,
            mint_account.key,
            mint_authority.key,
            mint_account.key,
            mint_authority.key,
            args.voucher_title,
            args.voucher_symbol,
            args.voucher_uri,
        ),
        &[
            mint_account.clone(),
            mint_authority.clone(),
            token_program.clone(),
            payer.clone(),
            system_program.clone(),
        ],
    )?;

    msg!("Token mint created successfully.");

    Ok(())
}
