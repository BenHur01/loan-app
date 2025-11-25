import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = 'https://kujvvupdqvtkncolhcul.supabase.co';
const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1anZ2dXBkcXZ0a25jb2xoY3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MDM0MzgsImV4cCI6MjA3OTM3OTQzOH0.VBnQywbTQwwWFLmjUAZggfIWC1_J5opHdFwyqMDD3QE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function goToPage(page) {
    window.location.href = page;
}

async function handleFormSubmission(event) {
    event.preventDefault();

    const requestedAmountString = localStorage.getItem('requestedLoanAmount');
    if (!requestedAmountString || parseFloat(requestedAmountString) < 200 || parseFloat(requestedAmountString) > 2000) {
        alert('Error: Start from agreement page with amount R200-R2000.');
        return window.location.href = 'agreement.html';
    }
    const requestedAmount = parseFloat(requestedAmountString);

    const fullName = document.getElementById('fullName').value;
    const idNumber = document.getElementById('idNumber').value;
    const contactNumber = document.getElementById('contactNumber').value;
    const residentialAddress = document.getElementById('residentialAddress').value;
    const bankName = document.getElementById('bankName').value;
    const bankAccountNumber = document.getElementById('bankAccountNumber').value;
    const agreedChecked = document.getElementById('agreedChecked').checked;
    const signatureText = document.getElementById('signatureText').value;

    if (!agreedChecked || signatureText.toUpperCase() !== 'YES') {
        alert('You must check the agreement box and type "YES".'); return;
    }

    // Documents
    const idDocFile = document.getElementById('idDoc').files[0];
    const addressDocFile = document.getElementById('addressDoc').files[0];
    const bankDocFile = document.getElementById('bankDoc').files[0];

    if (!idDocFile || !addressDocFile || !bankDocFile) {
        alert("Please upload all required documents."); return;
    }

    const modal = document.getElementById('confirmationModal');
    const confirmedDetails = document.getElementById('confirmedDetails');
    const confirmBtn = document.getElementById('confirmSubmitBtn');
    const cancelBtn = document.getElementById('cancelSubmitBtn');

    confirmedDetails.innerHTML = `
        <p><strong>Loan Amount:</strong> R${requestedAmount.toFixed(2)}</p>
        <p><strong>Full Name:</strong> ${fullName}</p>
        <p><strong>ID Number:</strong> ${idNumber}</p>
        <p><strong>Contact Number:</strong> ${contactNumber}</p>
        <p><strong>Residential Address:</strong> ${residentialAddress}</p>
        <p><strong>Bank Name:</strong> ${bankName}</p>
        <p><strong>Bank Account:</strong> ${bankAccountNumber}</p>
        <p><strong>Digital Signature:</strong> YES</p>
    `;

    modal.style.display = 'flex';

    return new Promise((resolve) => {
        const handleConfirm = () => { modal.style.display='none'; confirmBtn.removeEventListener('click', handleConfirm); cancelBtn.removeEventListener('click', handleCancel); resolve(true); };
        const handleCancel = () => { modal.style.display='none'; confirmBtn.removeEventListener('click', handleConfirm); cancelBtn.removeEventListener('click', handleCancel); resolve(false); };
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    })
    .then(async shouldSubmit => {
        if (!shouldSubmit) return;

        const timestamp = Date.now();
        const idPath = `id_documents/${idNumber}_id_${timestamp}`;
        const addrPath = `address_documents/${idNumber}_address_${timestamp}`;
        const bankPath = `bank_documents/${idNumber}_bank_${timestamp}`;

        // Upload files
        const { error: idErr } = await supabase.storage.from('loan_documents').upload(idPath, idDocFile);
        if (idErr) { alert("Failed to upload ID document."); console.error(idErr); return; }

        const { error: addrErr } = await supabase.storage.from('loan_documents').upload(addrPath, addressDocFile);
        if (addrErr) { alert("Failed to upload Address document."); console.error(addrErr); return; }

        const { error: bankErr } = await supabase.storage.from('loan_documents').upload(bankPath, bankDocFile);
        if (bankErr) { alert("Failed to upload Bank document."); console.error(bankErr); return; }

        // Insert into Supabase
        try {
            const { data, error } = await supabase.from('borrowers').insert([{
                full_name: fullName,
                id_number: idNumber,
                contact_number: contactNumber,
                residential_address: residentialAddress,
                requested_amount: requestedAmount,
                bank_name: bankName,
                amount_borrowed: requestedAmount,
                interest_rate: '0.50',
                repayment_period: 30,
                bank_account: bankAccountNumber,
                status: 'pending',
                document_id_url: idPath,
                document_address_url: addrPath,
                document_bank_url: bankPath
            }]).select();

            if (error) { console.error(error); alert("Failed to submit application."); return; }

            localStorage.setItem('currentUserId', data[0].id_number);
            alert('Application Submitted Successfully!');
            window.location.href = 'dashboard.html';

        } catch(e){ console.error(e); alert("Unexpected error occurred."); }
    });
}

export async function lookupBorrowerStatus(idNumber){
    if (!idNumber) return null;
    try {
        const { data, error } = await supabase.from('borrowers')
            .select('id_number, full_name, bank_name, bank_account, status, requested_amount, interest_rate, repayment_period, document_id_url, document_address_url, document_bank_url')
            .eq('id_number', idNumber).single();
        if (error && error.code!=='PGRST116')
		{ console.error(error); return null; }
        return data || null;
    } catch(e){ console.error(e); return null; }
}

const signupForm = document.getElementById('signupForm');
if (signupForm){ signupForm.addEventListener('submit', handleFormSubmission); console.log("Signup listener attached."); 
}
