//! Petty Ledger — XRPL smart vault WASM (`petty_ledger` crate).
//!
//! **Deposit (Payment into the vault account running this contract):** the filer (`Account`) attaches XRP and a memo:
//! - First line: `PETTY_LEDGER_V1`
//! - Line `subject:` + 40 hex chars = AccountID of the counterparty (the “victim” / subject of the grievance).
//! - Line `donation:` + 40 hex chars = AccountID where the stake would go if forfeited.
//!
//! **Withdraw:** only the **subject** may sign. `Destination` must be one of:
//! - **Filer** — cancel amicably; return stake to the filer (`REFUND`).
//! - **Subject** — subject receives the escrow (e.g. vindication / false grievance).
//! - **Donation** — forfeit stake to the disliked cause.

#![cfg_attr(target_arch = "wasm32", no_std)]

#[cfg(not(target_arch = "wasm32"))]
extern crate std;

use xrpl_wasm_stdlib::core::current_tx::get_field;
use xrpl_wasm_stdlib::core::locator::Locator;
use xrpl_wasm_stdlib::core::types::account_id::AccountID;
use xrpl_wasm_stdlib::core::types::amount::Amount;
use xrpl_wasm_stdlib::core::types::blob::MemoBlob;
use xrpl_wasm_stdlib::core::types::contract_data::{ContractData, XRPL_CONTRACT_DATA_SIZE};
use xrpl_wasm_stdlib::decode_hex_20;
use xrpl_wasm_stdlib::host::trace::{trace, trace_account};
use xrpl_wasm_stdlib::host::{
    get_current_ledger_obj_field, get_tx_nested_field, update_data, Result as XrplResult,
};
use xrpl_wasm_stdlib::sfield;

const MAGIC: &[u8; 4] = b"PETY";
const VERSION: u8 = 1;
const STATUS_EMPTY: u8 = 0;
const STATUS_OPEN: u8 = 1;

/// On-disk layout for the first 72 bytes of vault `Data` (rest is zero).
#[repr(C)]
#[derive(Clone, Copy)]
struct PettyState {
    magic: [u8; 4],
    version: u8,
    status: u8,
    reserved: [u8; 2],
    filer: [u8; 20],
    subject: [u8; 20],
    donation: [u8; 20],
    amount_drops: u64,
}

impl PettyState {
    fn empty() -> Self {
        Self {
            magic: [0; 4],
            version: 0,
            status: STATUS_EMPTY,
            reserved: [0; 2],
            filer: [0; 20],
            subject: [0; 20],
            donation: [0; 20],
            amount_drops: 0,
        }
    }

    fn from_bytes(data: &[u8; XRPL_CONTRACT_DATA_SIZE], len: usize) -> Self {
        if len < 72 {
            return Self::empty();
        }
        let mut s = Self::empty();
        s.magic.copy_from_slice(&data[0..4]);
        s.version = data[4];
        s.status = data[5];
        s.filer.copy_from_slice(&data[8..28]);
        s.subject.copy_from_slice(&data[28..48]);
        s.donation.copy_from_slice(&data[48..68]);
        s.amount_drops = u64::from_le_bytes([
            data[68], data[69], data[70], data[71], data[72], data[73], data[74], data[75],
        ]);
        s
    }

    fn write_to(&self, out: &mut [u8; XRPL_CONTRACT_DATA_SIZE]) {
        *out = [0u8; XRPL_CONTRACT_DATA_SIZE];
        out[0..4].copy_from_slice(&self.magic);
        out[4] = self.version;
        out[5] = self.status;
        out[6..8].copy_from_slice(&self.reserved);
        out[8..28].copy_from_slice(&self.filer);
        out[28..48].copy_from_slice(&self.subject);
        out[48..68].copy_from_slice(&self.donation);
        out[68..76].copy_from_slice(&self.amount_drops.to_le_bytes());
    }
}

fn read_contract_data() -> ContractData {
    let mut data = [0u8; XRPL_CONTRACT_DATA_SIZE];
    let code = unsafe { get_current_ledger_obj_field(sfield::Data.into(), data.as_mut_ptr(), data.len()) };
    let len = if code >= 0 { code as usize } else { 0 };
    ContractData { data, len }
}

fn persist_state(state: &PettyState) -> i32 {
    let mut buf = [0u8; XRPL_CONTRACT_DATA_SIZE];
    state.write_to(&mut buf);
    let used = 76usize;
    let result_code = unsafe { update_data(buf.as_ptr(), used) };
    if result_code < 0 {
        let _ = trace("update_data failed");
        return 0;
    }
    1
}

fn get_memo_data() -> Option<MemoBlob> {
    let mut locator = Locator::new();
    if !locator.pack(sfield::Memos) {
        return None;
    }
    if !locator.pack(0i32) {
        return None;
    }
    if !locator.pack(sfield::MemoData) {
        return None;
    }
    let mut blob = MemoBlob::new();
    let rc = unsafe {
        get_tx_nested_field(
            locator.as_ptr(),
            locator.len(),
            blob.data.as_mut_ptr(),
            blob.data.len(),
        )
    };
    if rc <= 0 {
        return None;
    }
    blob.len = rc as usize;
    Some(blob)
}

fn is_hex_byte(b: u8) -> bool {
    matches!(b, b'0'..=b'9' | b'a'..=b'f' | b'A'..=b'F')
}

fn trim_ws(mut s: &[u8]) -> &[u8] {
    while let Some((&first, rest)) = s.split_first() {
        if first == b' ' || first == b'\t' {
            s = rest;
        } else {
            break;
        }
    }
    while let Some((&last, rest)) = s.split_last() {
        if last == b' ' || last == b'\t' {
            s = rest;
        } else {
            break;
        }
    }
    s
}

/// Parse `subject:` / `donation:` lines with 40-character hex AccountIDs.
fn parse_petty_accounts(memo: &[u8]) -> Option<(AccountID, AccountID)> {
    let mut subject: Option<[u8; 20]> = None;
    let mut donation: Option<[u8; 20]> = None;

    for line in memo.split(|&b| b == b'\n' || b == b'\r') {
        if line.is_empty() {
            continue;
        }
        let line = trim_ws(line);
        const SUB: &[u8] = b"subject:";
        const DON: &[u8] = b"donation:";
        if line.len() >= SUB.len() && &line[..SUB.len()] == SUB {
            let rest = trim_ws(&line[SUB.len()..]);
            if rest.len() != 40 {
                continue;
            }
            let mut arr = [0u8; 40];
            arr.copy_from_slice(rest);
            if !arr.iter().all(|&b| is_hex_byte(b)) {
                continue;
            }
            if let Some(id) = decode_hex_20(&arr) {
                subject = Some(id);
            }
        } else if line.len() >= DON.len() && &line[..DON.len()] == DON {
            let rest = trim_ws(&line[DON.len()..]);
            if rest.len() != 40 {
                continue;
            }
            let mut arr = [0u8; 40];
            arr.copy_from_slice(rest);
            if !arr.iter().all(|&b| is_hex_byte(b)) {
                continue;
            }
            if let Some(id) = decode_hex_20(&arr) {
                donation = Some(id);
            }
        }
    }

    match (subject, donation) {
        (Some(s), Some(d)) => Some((AccountID(s), AccountID(d))),
        _ => None,
    }
}

fn memo_has_header(memo: &[u8]) -> bool {
    const HDR: &[u8] = b"PETTY_LEDGER_V1";
    for line in memo.split(|&b| b == b'\n' || b == b'\r') {
        let line = trim_ws(line);
        if line == HDR {
            return true;
        }
    }
    false
}

#[unsafe(no_mangle)]
pub extern "C" fn on_deposit() -> i32 {
    let existing = read_contract_data();
    let st = PettyState::from_bytes(&existing.data, existing.len);
    if st.status == STATUS_OPEN && st.magic == *MAGIC {
        let _ = trace("Deposit rejected: ledger slot already open");
        return 0;
    }

    let filer: AccountID = match get_field(sfield::Account) {
        XrplResult::Ok(a) => a,
        XrplResult::Err(_) => return 0,
    };

    let amount: Amount = match get_field(sfield::Amount) {
        XrplResult::Ok(a) => a,
        XrplResult::Err(_) => return 0,
    };

    let drops: u64 = match amount {
        Amount::XRP { num_drops } if num_drops > 0 => num_drops as u64,
        _ => {
            let _ = trace("Deposit rejected: need XRP amount > 0");
            return 0;
        }
    };

    let memo_blob = match get_memo_data() {
        Some(m) => m,
        None => {
            let _ = trace("Deposit rejected: missing Memos[0].MemoData");
            return 0;
        }
    };

    let memo = memo_blob.as_slice();
    if !memo_has_header(memo) {
        let _ = trace("Deposit rejected: expected PETTY_LEDGER_V1 header line");
        return 0;
    }

    let (subject, donation) = match parse_petty_accounts(memo) {
        Some(p) => p,
        None => {
            let _ = trace("Deposit rejected: need subject:/donation: hex AccountIDs");
            return 0;
        }
    };

    if filer.0 == subject.0 {
        let _ = trace("Deposit rejected: filer cannot equal subject");
        return 0;
    }
    if subject.0 == donation.0 {
        let _ = trace("Deposit rejected: subject cannot equal donation");
        return 0;
    }

    let new_state = PettyState {
        magic: *MAGIC,
        version: VERSION,
        status: STATUS_OPEN,
        reserved: [0; 2],
        filer: filer.0,
        subject: subject.0,
        donation: donation.0,
        amount_drops: drops,
    };

    let _ = trace_account("Petty open; filer", &filer);
    let _ = trace_account("Petty open; subject", &subject);
    persist_state(&new_state)
}

#[unsafe(no_mangle)]
pub extern "C" fn on_withdraw() -> i32 {
    let existing = read_contract_data();
    let st = PettyState::from_bytes(&existing.data, existing.len);

    if st.magic != *MAGIC || st.status != STATUS_OPEN {
        let _ = trace("Withdraw denied: no open petty record");
        return 0;
    }

    let signer: AccountID = match get_field(sfield::Account) {
        XrplResult::Ok(a) => a,
        XrplResult::Err(_) => return 0,
    };

    let dest: AccountID = match get_field(sfield::Destination) {
        XrplResult::Ok(a) => a,
        XrplResult::Err(_) => return 0,
    };

    if signer.0 != st.subject {
        let _ = trace("Withdraw denied: only subject may release funds");
        return 0;
    }

    let allowed = dest.0 == st.filer || dest.0 == st.subject || dest.0 == st.donation;
    if !allowed {
        let _ = trace("Withdraw denied: invalid Destination");
        return 0;
    }

    let mut cleared = PettyState::empty();
    cleared.magic = *MAGIC;
    cleared.version = VERSION;
    cleared.status = STATUS_EMPTY;

    if persist_state(&cleared) == 0 {
        return 0;
    }

    let _ = trace("Withdraw approved: subject authorized Destination");
    1
}
