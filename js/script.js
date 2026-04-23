document.addEventListener('DOMContentLoaded', () => {
    // --- Payment Overlay Logic ---
    const paymentOverlay = document.getElementById('payment-overlay');
    const mainApp = document.getElementById('main-app');
    const payButton = document.getElementById('pay-button');

    // Check if user has already paid
    const hasPaid = localStorage.getItem('tradecalc_paid') === 'true';

    if (!hasPaid) {
        mainApp.classList.add('blurred');
        paymentOverlay.style.display = 'flex';
    } else {
        paymentOverlay.style.display = 'none';
        mainApp.classList.remove('blurred');
    }

    payButton.addEventListener('click', async () => {
        console.log('Pay button clicked. Initializing Stripe...');
        const stripe = Stripe('pk_test_51OFBcaGdc1xOCo47iryj1mZHNcDOksxSYMbUMcy0CXVjg8G2AxcZlvqoeV1rahuIhu9kvrEk3hgVWt9bQW4EwvuS00vYAn2D0b');
        
        payButton.innerHTML = '<i class="ph-bold ph-circle-notch animate-spin"></i> Connecting...';
        payButton.disabled = true;

        try {
            console.log('Fetching checkout session from checkout.php...');
            const response = await fetch('checkout.php', { 
                method: 'POST'
            });

            console.log('Response received. Status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Server Error Data:', errorData);
                throw new Error(errorData.error || 'Server responded with ' + response.status);
            }

            const session = await response.json();
            console.log('Session created:', session);

            if (session.id) {
                console.log('Redirecting to Stripe Checkout...');
                const result = await stripe.redirectToCheckout({
                    sessionId: session.id
                });

                if (result.error) {
                    throw new Error(result.error.message);
                }
            } else {
                throw new Error('No session ID returned from server');
            }
        } catch (error) {
            console.error('Detailed Payment Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Connection Error',
                text: 'Details: ' + error.message,
                footer: 'Check your XAMPP console and network connection.',
                background: '#1A1A1A',
                color: '#FFFFFF'
            });
            payButton.innerHTML = '<i class="ph-fill ph-credit-card"></i> Pay to Calculate';
            payButton.disabled = false;
        }
    });

    const restoreLink = document.getElementById('restore-link');
    restoreLink.addEventListener('click', (e) => {
        e.preventDefault();
        Swal.fire({
            title: 'Check Purchase',
            text: 'Enter the email you used for payment:',
            input: 'email',
            inputPlaceholder: 'email@example.com',
            showCancelButton: true,
            confirmButtonText: 'Check',
            confirmButtonColor: '#FFC107',
            background: '#1A1A1A',
            color: '#FFFFFF',
            preConfirm: async (email) => {
                try {
                    const formData = new FormData();
                    formData.append('email', email);
                    const response = await fetch('restore.php', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();
                    if (!data.success) {
                        throw new Error(data.error || 'Email not found');
                    }
                    return { success: true, email: email };
                } catch (error) {
                    Swal.showValidationMessage(`Error: ${error.message}`);
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.setItem('tradecalc_paid', 'true');
                localStorage.setItem('tradecalc_email', result.value.email);
                Swal.fire({
                    icon: 'success',
                    title: 'Access Restored!',
                    text: 'Welcome back.',
                    background: '#1A1A1A',
                    color: '#FFFFFF'
                }).then(() => {
                    paymentOverlay.style.opacity = '0';
                    setTimeout(() => {
                        paymentOverlay.style.display = 'none';
                        mainApp.classList.remove('blurred');
                    }, 500);
                });
            }
        });
    });

    // --- Initial Data State ---
    let labourItems = [
        { id: 1, role: 'Electrician', days: 5, rate: 250 },
        { id: 2, role: 'Mate', days: 5, rate: 150 },
        { id: 3, role: 'Apprentice', days: 5, rate: 100 }
    ];
    let nextLabourId = 4;

    let extraItems = [
        { id: 1, desc: 'Parking', cost: 40 },
        { id: 2, desc: 'Tolls', cost: 30 }
    ];
    let nextExtraId = 3;

    // --- DOM Elements ---
    const labourList = document.getElementById('labour-list');
    const addLabourBtn = document.getElementById('add-labour-btn');
    const extrasList = document.getElementById('extras-list');
    const addExtraBtn = document.getElementById('add-extra-btn');

    // Inputs
    const adminDaysInput = document.getElementById('admin-days');
    const adminRateInput = document.getElementById('admin-rate');
    const dailyRunningCostInput = document.getElementById('daily-running-cost');
    const runningDaysInput = document.getElementById('running-days');
    const materialsCostInput = document.getElementById('materials-cost');
    const materialsMarkupInput = document.getElementById('materials-markup');
    const profitPercentInput = document.getElementById('profit-percent');
    const vatRegisteredToggle = document.getElementById('vat-registered');

    // Totals
    const labourTotalEl = document.getElementById('labour-total');
    const adminTotalEl = document.getElementById('admin-total');
    const runningTotalEl = document.getElementById('running-total');
    const materialsTotalEl = document.getElementById('materials-total-calc');
    const extrasTotalEl = document.getElementById('extras-total');
    const profitAmountEl = document.getElementById('profit-amount');
    const vatAmountEl = document.getElementById('vat-amount');
    
    const resetBtn = document.getElementById('reset-btn');

    // Summary Elements
    const sumLabourEl = document.getElementById('sum-labour');
    const sumAdminEl = document.getElementById('sum-admin');
    const sumRunningEl = document.getElementById('sum-running');
    const sumMaterialsEl = document.getElementById('sum-materials');
    const sumExtrasEl = document.getElementById('sum-extras');
    const sumSubtotalBPEl = document.getElementById('sum-subtotal-bp');
    const sumProfitLabelEl = document.getElementById('sum-profit-label');
    const sumProfitEl = document.getElementById('sum-profit');
    const sumSubtotalBVEl = document.getElementById('sum-subtotal-bv');
    const sumVatRowEl = document.getElementById('sum-vat-row');
    const sumVatEl = document.getElementById('sum-vat');
    const finalPriceEl = document.getElementById('final-price');

    // --- Formatters ---
    const formatCurrency = (value) => {
        if (value % 1 === 0) {
            return '£' + Number(value).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        } else {
            return '£' + Number(value).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    };

    const formatNumber = (value) => {
        if (value % 1 === 0) {
            return Number(value).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        } else {
            return Number(value).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    };

    // --- Render Functions ---
    const renderLabour = () => {
        labourList.innerHTML = '';
        labourItems.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'item-row labour-grid';
            
            row.innerHTML = `
                <i class="ph ph-dots-six-vertical drag-icon"></i>
                <select class="labour-role" data-id="${item.id}">
                    <option value="Electrician" ${item.role === 'Electrician' ? 'selected' : ''}>Electrician</option>
                    <option value="Mate" ${item.role === 'Mate' ? 'selected' : ''}>Mate</option>
                    <option value="Apprentice" ${item.role === 'Apprentice' ? 'selected' : ''}>Apprentice</option>
                </select>
                <input type="number" class="labour-days" data-id="${item.id}" value="${item.days}" min="0" step="0.5">
                <input type="number" class="labour-rate" data-id="${item.id}" value="${item.rate}" min="0">
                <div class="item-total" data-id="${item.id}">${formatNumber(item.days * item.rate)}</div>
                <button class="delete-btn delete-labour" data-id="${item.id}"><i class="ph ph-trash"></i></button>
            `;
            labourList.appendChild(row);
        });
        attachLabourListeners();
        calculateAll();
    };

    const renderExtras = () => {
        extrasList.innerHTML = '';
        extraItems.forEach(item => {
            const row = document.createElement('div');
            row.className = 'item-row extras-grid';
            
            row.innerHTML = `
                <input type="text" class="extra-desc" data-id="${item.id}" value="${item.desc}" placeholder="Description">
                <input type="number" class="extra-cost" data-id="${item.id}" value="${item.cost}" min="0">
                <button class="delete-btn delete-extra" data-id="${item.id}"><i class="ph ph-trash"></i></button>
            `;
            extrasList.appendChild(row);
        });
        attachExtraListeners();
        calculateAll();
    };

    // --- Event Listeners Attachment ---
    const attachLabourListeners = () => {
        document.querySelectorAll('.labour-role').forEach(input => {
            input.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id);
                const item = labourItems.find(i => i.id === id);
                item.role = e.target.value;
            });
        });
        document.querySelectorAll('.labour-days').forEach(input => {
            input.addEventListener('input', (e) => {
                const id = parseInt(e.target.dataset.id);
                const item = labourItems.find(i => i.id === id);
                item.days = parseFloat(e.target.value) || 0;
                
                // Update specific row total instead of re-rendering
                const totalEl = e.target.closest('.item-row').querySelector('.item-total');
                totalEl.textContent = formatNumber(item.days * item.rate);
                calculateAll();
            });
        });
        document.querySelectorAll('.labour-rate').forEach(input => {
            input.addEventListener('input', (e) => {
                const id = parseInt(e.target.dataset.id);
                const item = labourItems.find(i => i.id === id);
                item.rate = parseFloat(e.target.value) || 0;
                
                // Update specific row total instead of re-rendering
                const totalEl = e.target.closest('.item-row').querySelector('.item-total');
                totalEl.textContent = formatNumber(item.days * item.rate);
                calculateAll();
            });
        });
        document.querySelectorAll('.delete-labour').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                labourItems = labourItems.filter(i => i.id !== id);
                renderLabour();
            });
        });
    };

    const attachExtraListeners = () => {
        document.querySelectorAll('.extra-desc').forEach(input => {
            input.addEventListener('input', (e) => {
                const id = parseInt(e.target.dataset.id);
                const item = extraItems.find(i => i.id === id);
                item.desc = e.target.value;
            });
        });
        document.querySelectorAll('.extra-cost').forEach(input => {
            input.addEventListener('input', (e) => {
                const id = parseInt(e.target.dataset.id);
                const item = extraItems.find(i => i.id === id);
                item.cost = parseFloat(e.target.value) || 0;
                calculateAll();
            });
        });
        document.querySelectorAll('.delete-extra').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                extraItems = extraItems.filter(i => i.id !== id);
                renderExtras();
            });
        });
    };

    // --- Main Calculation Logic ---
    const calculateAll = () => {
        // 1. Labour
        let maxLabourDays = 0;
        let labourTotal = 0;
        labourItems.forEach(item => {
            labourTotal += (item.days * item.rate);
            if (item.days > maxLabourDays) maxLabourDays = item.days;
        });
        labourTotalEl.textContent = formatCurrency(labourTotal);
        sumLabourEl.textContent = formatCurrency(labourTotal);

        // Update Running Days (auto) based on max labour days
        runningDaysInput.value = maxLabourDays;

        // 2. Admin
        const adminDays = parseFloat(adminDaysInput.value) || 0;
        const adminRate = parseFloat(adminRateInput.value) || 0;
        const adminTotal = adminDays * adminRate;
        adminTotalEl.textContent = formatCurrency(adminTotal);
        sumAdminEl.textContent = formatCurrency(adminTotal);

        // 3. Running Costs
        const dailyRunningCost = parseFloat(dailyRunningCostInput.value) || 0;
        const runningTotal = dailyRunningCost * maxLabourDays;
        runningTotalEl.textContent = formatCurrency(runningTotal);
        sumRunningEl.textContent = formatCurrency(runningTotal);

        // 4. Materials
        const materialsCost = parseFloat(materialsCostInput.value) || 0;
        const materialsMarkup = parseFloat(materialsMarkupInput.value) || 0;
        const materialsTotal = materialsCost + (materialsCost * (materialsMarkup / 100));
        materialsTotalEl.textContent = formatCurrency(materialsTotal);
        sumMaterialsEl.textContent = formatCurrency(materialsTotal);

        // 5. Extras
        let extrasTotal = 0;
        extraItems.forEach(item => {
            extrasTotal += item.cost;
        });
        extrasTotalEl.textContent = formatCurrency(extrasTotal);
        sumExtrasEl.textContent = formatCurrency(extrasTotal);

        // Subtotals
        const subtotalBeforeProfit = labourTotal + adminTotal + runningTotal + materialsTotal + extrasTotal;
        sumSubtotalBPEl.textContent = formatCurrency(subtotalBeforeProfit);

        // 6. Profit
        const profitPercent = parseFloat(profitPercentInput.value) || 0;
        const profitAmount = subtotalBeforeProfit * (profitPercent / 100);
        
        profitAmountEl.textContent = formatCurrency(profitAmount);
        sumProfitLabelEl.textContent = `Profit (${profitPercent}%)`;
        sumProfitEl.textContent = formatCurrency(profitAmount);

        // Subtotal Before VAT
        const subtotalBeforeVAT = subtotalBeforeProfit + profitAmount;
        sumSubtotalBVEl.textContent = formatCurrency(subtotalBeforeVAT);

        // 7. VAT
        const isVatRegistered = vatRegisteredToggle.checked;
        let vatAmount = 0;
        
        if (isVatRegistered) {
            vatAmount = subtotalBeforeVAT * 0.20;
            sumVatRowEl.style.display = 'flex';
        } else {
            vatAmount = 0;
            sumVatRowEl.style.display = 'none';
        }

        vatAmountEl.textContent = formatCurrency(vatAmount);
        sumVatEl.textContent = formatCurrency(vatAmount);

        // Final Price
        const finalPrice = subtotalBeforeVAT + vatAmount;
        finalPriceEl.textContent = formatCurrency(finalPrice);
    };

    // --- Global Event Listeners ---
    addLabourBtn.addEventListener('click', () => {
        labourItems.push({ id: nextLabourId++, role: 'Electrician', days: 1, rate: 250 });
        renderLabour();
    });

    addExtraBtn.addEventListener('click', () => {
        extraItems.push({ id: nextExtraId++, desc: 'New Extra', cost: 0 });
        renderExtras();
    });

    resetBtn.addEventListener('click', () => {
        Swal.fire({
            title: 'Are you sure?',
            text: "All values will be reset to default!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#FFC107',
            cancelButtonColor: '#333',
            confirmButtonText: 'Yes, reset it!',
            background: '#1A1A1A',
            color: '#FFFFFF'
        }).then((result) => {
            if (result.isConfirmed) {
                labourItems = [
                    { id: 1, role: 'Electrician', days: 5, rate: 250 },
                    { id: 2, role: 'Mate', days: 5, rate: 150 },
                    { id: 3, role: 'Apprentice', days: 5, rate: 100 }
                ];
                nextLabourId = 4;
                extraItems = [
                    { id: 1, desc: 'Parking', cost: 40 },
                    { id: 2, desc: 'Tolls', cost: 30 }
                ];
                nextExtraId = 3;
                
                adminDaysInput.value = 1;
                adminRateInput.value = 250;
                dailyRunningCostInput.value = 80;
                materialsCostInput.value = 1200;
                materialsMarkupInput.value = 0;
                profitPercentInput.value = 20;
                vatRegisteredToggle.checked = true;
                
                renderLabour();
                renderExtras();

                Swal.fire({
                    title: 'Reset!',
                    text: 'Values have been reset.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                    background: '#1A1A1A',
                    color: '#FFFFFF'
                });
            }
        });
    });

    [adminDaysInput, adminRateInput, dailyRunningCostInput, materialsCostInput, materialsMarkupInput, profitPercentInput].forEach(input => {
        input.addEventListener('input', calculateAll);
    });

    vatRegisteredToggle.addEventListener('change', calculateAll);

    // Initial render
    renderLabour();
    renderExtras();
});
