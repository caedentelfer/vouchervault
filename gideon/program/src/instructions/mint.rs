use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};
use spl_associated_token_account::instruction as associated_token_account_instruction;
use spl_token_2022::{
    extension::{metadata_pointer::instruction as metadata_pointer_instruction, ExtensionType},
    instruction as token_instruction,
    state::Mint,
};
use spl_token_metadata_interface::{instruction as metadata_instruction, state::Field};

use crate::state::authority::MintAuthorityPda;

#[derive(BorshSerialize, BorshDeserialize, Clone, Debug)]
pub struct MintVoucherArgs {
    pub title: String,
    pub description: String,
    pub symbol: String,
    pub uri: String,
    pub expiry: i64,
}

pub fn mint_voucher(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    args: MintVoucherArgs,
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();

    let escrow_account = next_account_info(accounts_iter)?;
    let payer = next_account_info(accounts_iter)?;
    let mint_account = next_account_info(accounts_iter)?;
    let mint_authority = next_account_info(accounts_iter)?;
    let associated_token_account = next_account_info(accounts_iter)?;
    let rent = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;
    let token_program = next_account_info(accounts_iter)?;
    let _associated_token_program = next_account_info(accounts_iter)?;

    let (mint_authority_pda, bump) =
        Pubkey::find_program_address(&[MintAuthorityPda::SEED_PREFIX.as_bytes()], program_id);
    assert!(&mint_authority_pda.eq(mint_authority.key));

    let space =
        ExtensionType::try_calculate_account_len::<Mint>(&[ExtensionType::MetadataPointer])?;

    let meta_data_space = 1000; // TODO: Calculate metadata space

    // Get the required rent exemption amount for the account
    let rent_required = Rent::get()?.minimum_balance(space + meta_data_space);

    // First create account for the Mint
    msg!("Creating mint account...");
    msg!("Mint: {}", mint_account.key);
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
    msg!("Initializing metadata pointer extension...");
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

    msg!("Initializing metadata extension...");
    invoke_signed(
        &metadata_instruction::initialize(
            token_program.key,
            mint_account.key,
            mint_authority.key,
            mint_account.key,
            mint_authority.key,
            args.title,
            args.symbol,
            args.uri,
        ),
        &[
            mint_account.clone(),
            mint_authority.clone(),
            token_program.clone(),
            payer.clone(),
            system_program.clone(),
        ],
        &[&[MintAuthorityPda::SEED_PREFIX.as_bytes(), &[bump]]],
    )?;

    invoke_signed(
        &metadata_instruction::update_field(
            token_program.key,
            mint_account.key,
            mint_authority.key,
            Field::Key("escrow".to_string()),
            escrow_account.key.to_string(),
        ),
        &[
            escrow_account.clone(),
            mint_account.clone(),
            mint_authority.clone(),
            token_program.clone(),
        ],
        &[&[MintAuthorityPda::SEED_PREFIX.as_bytes(), &[bump]]],
    )?;

    invoke_signed(
        &metadata_instruction::update_field(
            token_program.key,
            mint_account.key,
            mint_authority.key,
            Field::Key("expiry".to_string()),
            args.expiry.to_string(),
        ),
        &[
            escrow_account.clone(),
            mint_account.clone(),
            mint_authority.clone(),
            token_program.clone(),
        ],
        &[&[MintAuthorityPda::SEED_PREFIX.as_bytes(), &[bump]]],
    )?;

    msg!("Token mint created successfully.");

    // First create account for the Mint
    if associated_token_account.lamports() == 0 {
        msg!("Creating associated token account...");
        invoke(
            &associated_token_account_instruction::create_associated_token_account(
                payer.key,
                payer.key,
                mint_account.key,
                token_program.key,
            ),
            &[
                payer.clone(),
                associated_token_account.clone(),
                payer.clone(),
                mint_account.clone(),
                system_program.clone(),
                token_program.clone(),
            ],
        )?;
    } else {
        msg!("Associated token account exists.");
    }
    msg!("Associated Token Address: {}", associated_token_account.key);

    // Mint the NFT to the user's wallet
    msg!("Minting NFT to associated token account...");
    invoke_signed(
        &token_instruction::mint_to(
            token_program.key,
            mint_account.key,
            associated_token_account.key,
            mint_authority.key,
            &[mint_authority.key],
            1,
        )?,
        &[
            mint_account.clone(),
            mint_authority.clone(),
            associated_token_account.clone(),
            token_program.clone(),
        ],
        &[&[MintAuthorityPda::SEED_PREFIX.as_bytes(), &[bump]]],
    )?;

    msg!("Disabling future minting of this NFT...");
    invoke_signed(
        &token_instruction::set_authority(
            token_program.key,
            mint_account.key,
            None,
            token_instruction::AuthorityType::MintTokens,
            mint_authority.key,
            &[mint_authority.key],
        )?,
        &[
            mint_account.clone(),
            mint_authority.clone(),
            token_program.clone(),
        ],
        &[&[MintAuthorityPda::SEED_PREFIX.as_bytes(), &[bump]]],
    )?;
    invoke_signed(
        &token_instruction::set_authority(
            token_program.key,
            mint_account.key,
            None,
            token_instruction::AuthorityType::FreezeAccount,
            mint_authority.key,
            &[mint_authority.key],
        )?,
        &[
            mint_account.clone(),
            mint_authority.clone(),
            token_program.clone(),
        ],
        &[&[MintAuthorityPda::SEED_PREFIX.as_bytes(), &[bump]]],
    )?;

    msg!("NFT minted successfully.");

    Ok(())
}
