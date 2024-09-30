use borsh::BorshDeserialize;
use solana_program::{
    account_info::AccountInfo, declare_id, entrypoint, entrypoint::ProgramResult, pubkey::Pubkey,
};

use crate::{
    instruction::GideonInstruction,
    instructions::{
        burn::burn_voucher_release_escrow, escrow::init_escrow, init_authority::init,
        mint::mint_voucher,
    },
};

// declare and export the program's entrypoint
declare_id!("gidsaNxwQbr6pyLDaqVn4pPwAypkjwFNZQvvKBJ1Rbi");
entrypoint!(process_instruction);

// program entrypoint's implementation
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = GideonInstruction::try_from_slice(instruction_data)?;

    match instruction {
        GideonInstruction::InitMintAuthority => init(program_id, accounts),
        GideonInstruction::InitEscrowAndMintVoucher(escrow_args, mint_args) => {
            init_escrow(program_id, accounts, escrow_args)?;
            mint_voucher(program_id, accounts, mint_args)?;
            Ok(())
        }
        GideonInstruction::ReleaseEscrowAndBurnVoucher => {
            burn_voucher_release_escrow(program_id, accounts)?;
            Ok(())
        }
    }
}
