/**
 * CryptoVisual - Pro Dashboard Logic (Ultima Version)
 * Features: Portfolio Tracker, Modal System, Currency Sync, & Smart Cache.
 * Date: December 2025
 */

// --- GLOBAL VARIABLES ---
let mainChartInstance = null;
let currentPage = 1;
let currentCurrency = 'usd';
let myPortfolio = JSON.parse(localStorage.getItem('my_portfolio')) || {
    bitcoin: 0.1,  // Default assets for demo
    ethereum: 1.2,
    solana: 5.5
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    loadDashboard();
    
    // Auto-refresh every 3 minutes to stay within free API limits
    setInterval(loadDashboard, 180000);

    // 1. Timeframe Filter Listeners
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const tf = this.innerText;
            initMainChart(tf === '1W' ? '7' : '1', tf === '1H');
        });
    });

    // 2. Pagination Listeners
    const nextBtn = document.getElementById('next-page');
    const prevBtn = document.getElementById('prev-page');
    nextBtn?.addEventListener('click', () => { currentPage++; updateMarketTable(currentPage); scrollToTable(); });
    prevBtn?.addEventListener('click', () => { if (currentPage > 1) { currentPage--; updateMarketTable(currentPage); scrollToTable(); } });

    // 3. Currency Switcher Listener
    document.querySelectorAll('.currency-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const selected = this.getAttribute('data-currency');
            if (selected !== currentCurrency) {
                document.querySelectorAll('.currency-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                changeCurrency(selected);
            }
        });
    });

    // 4. Search Filter
    document.getElementById('coin-search')?.addEventListener('input', function(e) {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('#market-table-body tr').forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    });
});

// --- CORE DASHBOARD LOGIC ---

async function loadDashboard() {
    await fetchTopMarketData();
    await initMainChart('1', false);
    await updateMarketTable(currentPage);
    await updatePortfolioUI(); // Re-calculate portfolio value
}

async function changeCurrency(newCurrency) {
    currentCurrency = newCurrency;
    localStorage.removeItem('portfolio_prices');
    localStorage.removeItem(`top_assets_${newCurrency}`);
    await loadDashboard();
}

/**
 * SMART FETCH: Prevents CORS/Rate Limit issues by using LocalStorage Caching
 */
async function smartFetch(url, fallback, cacheKey, expiryMins = 5) {
    const cached = localStorage.getItem(cacheKey);
    const now = new Date();

    if (cached) {
        const cacheData = JSON.parse(cached);
        if (now.getTime() < cacheData.expiry) return cacheData.data;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        localStorage.setItem(cacheKey, JSON.stringify({
            data: data,
            expiry: now.getTime() + (expiryMins * 60000)
        }));
        return data;
    } catch (error) {
        console.warn(`[API] Fallback active for ${cacheKey}`);
        return fallback; // Uses MOCK_DATA if API fails
    }
}

// --- PORTFOLIO & MODAL FUNCTIONS ---

function togglePortfolioModal() {
    const modal = document.getElementById('portfolio-modal');
    if (modal) modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
}

async function saveAsset() {
    const coin = document.getElementById('coin-select').value;
    const amount = parseFloat(document.getElementById('coin-amount').value);

    if (isNaN(amount) || amount <= 0) {
        showToast("Please enter a valid amount", "warning");
        return;
    }

    myPortfolio[coin] = (myPortfolio[coin] || 0) + amount;
    localStorage.setItem('my_portfolio', JSON.stringify(myPortfolio));
    
    document.getElementById('coin-amount').value = '';
    togglePortfolioModal();
    showToast(`Added ${amount} ${coin.toUpperCase()} to portfolio`, "success");
    await updatePortfolioUI();
}

async function updatePortfolioUI() {
    const symbol = currentCurrency === 'idr' ? 'Rp ' : '$';
    const totalEl = document.getElementById('total-balance');
    if (!totalEl) return;

    const savedPortfolio = JSON.parse(localStorage.getItem('my_portfolio')) || {};
    if (Object.keys(savedPortfolio).length === 0) {
        totalEl.innerText = `${symbol}0`;
        return;
    }

    // API Utama untuk Portofolio
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=${currentCurrency}`;
    
    // Gunakan smartFetch dengan fallback objek kosong agar tidak error
    let prices = await smartFetch(url, null, 'portfolio_prices', 2);

    // --- DOUBLE FALLBACK LOGIC ---
    // Jika API di atas gagal (null karena CORS), cari harga di cache 'top_assets'
    if (!prices) {
        const topAssetsCache = JSON.parse(localStorage.getItem(`top_assets_${currentCurrency}`));
        if (topAssetsCache && topAssetsCache.data) {
            prices = {};
            topAssetsCache.data.forEach(coin => {
                prices[coin.id] = { [currentCurrency]: coin.current_price };
            });
        }
    }

    // Jika masih gagal juga, gunakan harga dari MOCK_DATA
    if (!prices) {
        prices = {};
        MOCK_DATA.forEach(coin => {
            // Simulasi konversi sederhana jika IDR (Hanya untuk fallback darurat)
            const multiplier = currentCurrency === 'idr' ? 15000 : 1;
            prices[coin.id] = { [currentCurrency]: coin.current_price * multiplier };
        });
    }

    let totalValue = 0;
    for (const [coin, amount] of Object.entries(savedPortfolio)) {
        if (prices[coin] && prices[coin][currentCurrency]) {
            totalValue += amount * prices[coin][currentCurrency];
        }
    }

    // Update UI dengan format angka yang benar
    totalEl.innerText = `${symbol}${totalValue.toLocaleString(currentCurrency === 'idr' ? 'id-ID' : 'en-US')}`;
}

// --- UI DATA RENDERING ---

async function fetchTopMarketData() {
    const symbol = currentCurrency === 'idr' ? 'Rp ' : '$';
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currentCurrency}&ids=bitcoin,ethereum,solana&sparkline=true`;
    const data = await smartFetch(url, MOCK_DATA.slice(0, 3), `top_assets_${currentCurrency}`);

    data.forEach(coin => {
        const id = coin.id === 'bitcoin' ? 'btc' : (coin.id === 'ethereum' ? 'eth' : 'sol');
        const priceEl = document.getElementById(`${id}-price`);
        const changeEl = document.getElementById(`${id}-change`);
        
        if (priceEl) priceEl.innerText = `${symbol}${coin.current_price.toLocaleString()}`;
        if (changeEl) {
            const isUp = coin.price_change_percentage_24h >= 0;
            changeEl.innerText = `${isUp ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}%`;
            changeEl.className = `change-tag ${isUp ? 'up' : 'down'}`;
            if (coin.sparkline_in_7d) renderMiniChart(`chart${id.toUpperCase()}`, coin.sparkline_in_7d.price, isUp ? '#22c55e' : '#ef4444');
        }
    });
}

async function updateMarketTable(page) {
    const tableBody = document.getElementById('market-table-body');
    const symbol = currentCurrency === 'idr' ? 'Rp ' : '$';
    if (!tableBody) return;

    // Show Skeleton Shimmer
    tableBody.innerHTML = Array(10).fill(0).map(() => `
        <tr>
            <td><div class="coin-info-cell"><div class="skeleton-img skeleton"></div> <div class="skeleton-text skeleton" style="width: 80px;"></div></div></td>
            <td><div class="skeleton-text skeleton" style="width: 60px;"></div></td>
            <td><div class="skeleton-text skeleton" style="width: 50px;"></div></td>
            <td><div class="skeleton-text skeleton" style="width: 100px;"></div></td>
        </tr>
    `).join('');

    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currentCurrency}&order=market_cap_desc&per_page=10&page=${page}`;
    const data = await smartFetch(url, MOCK_DATA, `market_page_${currentCurrency}_${page}`);

    setTimeout(() => {
        tableBody.innerHTML = '';
        data.forEach(coin => {
            const isUp = coin.price_change_percentage_24h >= 0;
            tableBody.insertAdjacentHTML('beforeend', `
                <tr>
                    <td><div class="coin-info-cell"><img src="${coin.image}" width="24"><strong>${coin.name} <span class="coin-symbol">${coin.symbol.toUpperCase()}</span></strong></div></td>
                    <td>${symbol}${coin.current_price.toLocaleString()}</td>
                    <td><span class="status-pill ${isUp ? 'success' : 'error'}">${isUp ? '▲' : '▼'} ${Math.abs(coin.price_change_percentage_24h || 0).toFixed(2)}%</span></td>
                    <td>${symbol}${(coin.market_cap || 0).toLocaleString()}</td>
                </tr>
            `);
        });
        document.getElementById('current-page-display').innerText = page;
        document.getElementById('prev-page').disabled = (page === 1);
    }, 400);
}

// --- VISUAL HELPERS ---

function renderMiniChart(id, dataPoints, color) {
    const el = document.getElementById(id);
    if (!el) return;
    const ctx = el.getContext('2d');
    const existing = Chart.getChart(id);
    if (existing) existing.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 50);
    gradient.addColorStop(0, color + '44');
    gradient.addColorStop(1, 'transparent');

    new Chart(el, {
        type: 'line',
        data: {
            labels: dataPoints.map((_, i) => i),
            datasets: [{ data: dataPoints, borderColor: color, backgroundColor: gradient, fill: true, borderWidth: 2, pointRadius: 0, tension: 0.4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
    });
}

async function initMainChart(days, isOneHour) {
    const ctx = document.getElementById('mainChart');
    if (!ctx) return;
    const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=${currentCurrency}&days=${days}`;
    const result = await smartFetch(url, { prices: [] }, `main_chart_btc_${currentCurrency}_${days}`);
    
    if (!result.prices || result.prices.length === 0) return;
    let prices = result.prices.map(p => p[1]);
    let labels = result.prices.map(p => {
        const d = new Date(p[0]);
        return days === '1' ? `${d.getHours()}:00` : d.toLocaleDateString();
    });

    if (mainChartInstance) mainChartInstance.destroy();
    mainChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ data: prices, borderColor: '#d9ff00', backgroundColor: 'rgba(217, 255, 0, 0.05)', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 3 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#888', maxTicksLimit: 8 }, grid: { display: false } }, y: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } } } }
    });
}

function initMobileMenu() {
    const toggle = document.getElementById('mobile-menu');
    const nav = document.getElementById('nav-list');
    toggle?.addEventListener('click', () => { nav.classList.toggle('active'); toggle.classList.toggle('active'); });
}

function scrollToTable() { document.querySelector('.market-table-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

function showToast(msg, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add('show'); setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 500); }, 3000); }, 100);
}

// --- FALLBACK DATA ---
const MOCK_DATA = [
    { id: 'bitcoin', name: "Bitcoin", symbol: "btc", current_price: 95420, price_change_percentage_24h: 1.25, market_cap: 1800000000000, image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png", sparkline_in_7d: { price: [90,92,91,95,94,96,95] } },
    { id: 'ethereum', name: "Ethereum", symbol: "eth", current_price: 2850, price_change_percentage_24h: -0.45, market_cap: 350000000000, image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png", sparkline_in_7d: { price: [2700,2750,2800,2780,2850,2900,2850] } },
    { id: 'solana', name: "Solana", symbol: "sol", current_price: 145, price_change_percentage_24h: 4.2, market_cap: 65000000000, image: "https://assets.coingecko.com/coins/images/4128/large/solana.png", sparkline_in_7d: { price: [130,135,140,138,142,148,145] } },
    { id: 'binancecoin', name: "BNB", symbol: "bnb", current_price: 605, price_change_percentage_24h: 0.8, market_cap: 90000000000, image: "https://assets.coingecko.com/coins/images/825/large/binance-coin-logo.png" },
    { id: 'ripple', name: "XRP", symbol: "xrp", current_price: 0.62, price_change_percentage_24h: -1.5, market_cap: 34000000000, image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png" },
    { id: 'cardano', name: "Cardano", symbol: "ada", current_price: 0.45, price_change_percentage_24h: 2.1, market_cap: 16000000000, image: "https://assets.coingecko.com/coins/images/975/large/cardano.png" },
    { id: 'dogecoin', name: "Dogecoin", symbol: "doge", current_price: 0.16, price_change_percentage_24h: -3.2, market_cap: 23000000000, image: "https://assets.coingecko.com/coins/images/692/large/dogecoin.png" },
    { id: 'polkadot', name: "Polkadot", symbol: "dot", current_price: 7.20, price_change_percentage_24h: 1.1, market_cap: 10000000000, image: "https://assets.coingecko.com/coins/images/12171/large/polkadot.png" },
    { id: 'tron', name: "TRON", symbol: "trx", current_price: 0.12, price_change_percentage_24h: 0.5, market_cap: 11000000000, image: "https://assets.coingecko.com/coins/images/1094/large/tron.png" },
    { id: 'chainlink', name: "Chainlink", symbol: "link", current_price: 14.50, price_change_percentage_24h: -1.8, market_cap: 8500000000, image: "https://assets.coingecko.com/coins/images/877/large/chainlink.png" }
];

// --- SERVICE WORKER REGISTRATION ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(() => console.log('Service Worker Registered'))
    .catch(err => console.log('Service Worker Failed', err));
}