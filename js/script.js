// Mengambil Data Harga Real-Time
async function updatePrices() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true');
        const data = await response.json();

        // Update Bitcoin
        document.getElementById('btc-price').innerText = `$${data.bitcoin.usd.toLocaleString()}`;
        updateChangeTag('btc-change', data.bitcoin.usd_24h_change);

        // Update Ethereum
        document.getElementById('eth-price').innerText = `$${data.ethereum.usd.toLocaleString()}`;
        updateChangeTag('eth-change', data.ethereum.usd_24h_change);

        // Update Solana
        document.getElementById('sol-price').innerText = `$${data.solana.usd.toLocaleString()}`;
        updateChangeTag('sol-change', data.solana.usd_24h_change);

    } catch (error) {
        console.error("Gagal mengambil data harga", error);
    }
}

function updateChangeTag(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    const isUp = value >= 0;
    el.innerText = `${isUp ? '+' : ''}${value.toFixed(2)}%`;
    el.className = `change-tag ${isUp ? 'up' : 'down'}`;
}

// Inisialisasi Grafik (Chart.js)
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { display: false }, y: { display: false } },
    elements: { line: { tension: 0.4, borderWidth: 2, borderColor: '#fff' }, point: { radius: 0 } }
};

function createMiniChart(id, color) {
    const ctx = document.getElementById(id).getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: [1, 2, 3, 4, 5, 6, 7],
            datasets: [{
                data: [65, 59, 80, 81, 56, 55, 40].map(n => n * Math.random()),
                borderColor: color,
                fill: false
            }]
        },
        options: chartOptions
    });
}

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    updatePrices();
    setInterval(updatePrices, 30000); // Update setiap 30 detik

    createMiniChart('chartBTC', '#ffffff');
    createMiniChart('chartETH', '#ffffff');
    createMiniChart('chartSOL', '#ffffff');

    // Grafik Utama Dashboard
    const mainCtx = document.getElementById('mainChart').getContext('2d');
    new Chart(mainCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Market Volume',
                data: [12, 19, 3, 5, 2, 3],
                borderColor: '#ffffff',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } },
                x: { grid: { display: false }, ticks: { color: '#888' } }
            },
            plugins: { legend: { display: false } }
        }
    });
});