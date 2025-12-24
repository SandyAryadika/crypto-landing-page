// --- Mobile Menu Logic ---
const menuToggle = document.getElementById('mobile-menu');
const navList = document.getElementById('nav-list');
const openModalBtn = document.getElementById('connectWalletBtn');
const closeModalBtn = document.getElementById('closeModal');
const walletModal = document.getElementById('walletModal');

if (menuToggle && navList) {
    menuToggle.addEventListener('click', () => {
        // Toggle class 'active' pada menu list dan tombol hamburger
        navList.classList.toggle('active');
        menuToggle.classList.toggle('active');
    });
}

if (openModalBtn) {
    openModalBtn.onclick = (e) => {
        e.preventDefault();
        walletModal.classList.add('active');
        document.body.classList.add('modal-open'); // Untuk mematikan scroll di CSS
    }
}

// Tutup menu otomatis saat link diklik
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navList.classList.remove('active');
        menuToggle.classList.remove('active');
    });
});

// --- Data & Chart Logic (Tetap Sama) ---

// Mengambil Data Harga Real-Time
async function updatePrices() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true');
        const data = await response.json();

        // Update Bitcoin
        if(document.getElementById('btc-price')) {
            document.getElementById('btc-price').innerText = `$${data.bitcoin.usd.toLocaleString()}`;
        }

        // Update Ethereum
        if(document.getElementById('eth-price')) {
            document.getElementById('eth-price').innerText = `$${data.ethereum.usd.toLocaleString()}`;
        }

        // Update Solana
        if(document.getElementById('sol-price')) {
            document.getElementById('sol-price').innerText = `$${data.solana.usd.toLocaleString()}`;
        }

    } catch (error) {
        console.error("Gagal mengambil data harga", error);
    }
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
    const el = document.getElementById(id);
    if (!el) return;
    const ctx = el.getContext('2d');
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

/* CryptoVisual Ultimate Real-Time Logic 
    Powered by CoinGecko API v3
*/

document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi Navigasi Mobile
    initMobileMenu();

    // Ambil Data Pasar Utama (Harga & Mini Charts)
    fetchMarketData();
    setInterval(fetchMarketData, 60000); // Update setiap 1 menit

    // Inisialisasi Grafik Dashboard Utama (Default: 1D)
    updateMainChart('1'); 

    // Event Listener untuk Filter Waktu Dashboard
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const days = this.innerText === '1H' ? '1' : (this.innerText === '1D' ? '1' : '7');
            updateMainChart(days);
        });
    });
});

// --- 1. Fungsi Mengambil Data Pasar Real-Time ---
async function fetchMarketData() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana&order=market_cap_desc&sparkline=true&price_change_percentage=24h');
        const data = await response.json();

        data.forEach(coin => {
            const id = coin.id === 'bitcoin' ? 'btc' : (coin.id === 'ethereum' ? 'eth' : 'sol');
            
            // Update Harga
            document.getElementById(`${id}-price`).innerText = `$${coin.current_price.toLocaleString()}`;
            
            // Update Persentase Perubahan
            const changeEl = document.getElementById(`${id}-change`);
            const change = coin.price_change_percentage_24h;
            const isUp = change >= 0;
            changeEl.innerText = `${isUp ? '+' : ''}${change.toFixed(2)}%`;
            changeEl.className = `change-tag ${isUp ? 'up' : 'down'}`;

            // Update Mini Chart dengan Data Sparkline Asli
            renderMiniChart(`chart${id.toUpperCase()}`, coin.sparkline_in_7d.price, isUp ? '#22c55e' : '#ef4444');
        });
    } catch (error) {
        console.error("Gagal mengambil data pasar:", error);
    }
}

// --- 2. Fungsi Grafik Utama (Historical Data) ---
let mainChart;
async function updateMainChart(days) {
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`);
        const data = await response.json();
        
        // Ambil data harga saja (index 1 dari array Coingecko)
        const prices = data.prices.map(p => p[1]);
        const labels = data.prices.map(p => {
            const date = new Date(p[0]);
            return days === '1' ? `${date.getHours()}:00` : date.toLocaleDateString();
        });

        const ctx = document.getElementById('mainChart').getContext('2d');
        
        if (mainChart) mainChart.destroy(); // Hapus grafik lama sebelum update

        mainChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Bitcoin Market Performance',
                    data: prices,
                    borderColor: '#d9ff00',
                    backgroundColor: 'rgba(217, 255, 0, 0.05)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } },
                    x: { grid: { display: false }, ticks: { color: '#888', maxTicksLimit: 8 } }
                },
                plugins: { legend: { display: false } }
            }
        });
    } catch (error) {
        console.error("Gagal mengambil data grafik utama:", error);
    }
}

// --- 3. Helper Functions ---
function renderMiniChart(id, dataPoints, color) {
    const ctx = document.getElementById(id).getContext('2d');
    
    // Cari Chart instance yang sudah ada untuk dihancurkan agar tidak tumpang tindih
    const existingChart = Chart.getChart(id);
    if (existingChart) existingChart.destroy();

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dataPoints.map((_, i) => i),
            datasets: [{
                data: dataPoints,
                borderColor: color,
                borderWidth: 2,
                fill: false,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { display: false } }
        }
    });
}

function initMobileMenu() {
    const menuToggle = document.getElementById('mobile-menu');
    const navList = document.getElementById('nav-list');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            navList.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });
    }
}