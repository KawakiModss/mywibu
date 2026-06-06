// ========== TAILWIND CONFIG ==========
tailwind.config = {
    theme: {
        extend: {
            colors: { 
                dark: '#0f0f0f', 
                surface: '#1a1a1a', 
                primary: '#f59e0b', 
                primaryDark: '#d97706',
                secondary: '#fbbf24'
            },
            fontFamily: { sans: ['Poppins', 'sans-serif'] },
        }
    }
};

// ========== REALTIME API (TARUH PALING ATAS AGAR BISA DIPAKAI SEMUA FUNGSI) ==========
const API_URL = window.location.origin + '/api.php';

async function apiCall(action, body = null, query = '') {
    let url = `${API_URL}?action=${action}`;
    if (query) url += '&' + query;
    try {
        let res = await fetch(url, {
            method: body ? 'POST' : 'GET',
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : null
        });
        return await res.json();
    } catch(e) { 
        console.error('API Error:', e); 
        return null; 
    }
}

// ========== MODAL COMMUNITY ==========
function showCommunityModal() {
    var modal = document.getElementById('communityModal');
    var hasShown = localStorage.getItem('community_modal_shown');
    if(!hasShown && modal) {
        setTimeout(function() {
            var cu = getCurrentUser();
            var isGuest = DB.get('guest_mode') === true;
            if(cu || isGuest) {
                var userId = cu ? (cu.userId || '#000000') : '#GUEST';
                var level = cu ? (cu.level || 1) : 1;
                var exp = cu ? (cu.xp || 0) : 0;
                var progress = getXPProgress(exp);
                var neededExp = progress.needed;
                var wibuGem = cu ? (cu.wibuGem || 0) : 0;
                var keys = cu ? (cu.keys || 0) : 0;
                
                document.getElementById('modal-user-id').innerHTML = userId;
                document.getElementById('modal-user-level').innerHTML = level;
                document.getElementById('modal-user-exp').innerHTML = exp + '/' + neededExp;
                document.getElementById('modal-user-gem').innerHTML = wibuGem;
                document.getElementById('modal-user-key').innerHTML = keys;
                
                modal.classList.remove('hidden');
            }
        }, 1000);
    }
}

function closeCommunityModal() {
    var modal = document.getElementById('communityModal');
    if(modal) {
        modal.classList.add('hidden');
        localStorage.setItem('community_modal_shown', 'true');
    }
}

// ========== KONFIGURASI AWAL ==========
var IKLAN_ARRAY = [
    'https://www.w3schools.com/html/mov_bbb.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4'
];
var MAX_IKLAN_PER_HARI = 3;
var PREMIUM_KEY_PER_DAY = 2;
var EPISODE_KEY_COST = 1;
var EPISODE_PER_LEVEL_UP = 5;
var LEVEL_GAIN_PER_EPISODE = 3;

var todayIklanCount = 0;
var pendingEpisodeCallback = null;
var customAnimeList = [];

// ========== STORAGE ==========
const DB = { get: function(k) { try { return JSON.parse(localStorage.getItem('ak_'+k)) } catch(e) { return null } }, set: function(k,v) { localStorage.setItem('ak_'+k, JSON.stringify(v)) }, del: function(k) { localStorage.removeItem('ak_'+k) } };

function getUsers() { return DB.get('users') || {} }
function saveUsers(u) { DB.set('users', u); }
function getCurrentUser() { return DB.get('current_user') }
function setCurrentUser(u) { DB.set('current_user', u); updateUserUI(); }
function getReports() { return DB.get('reports') || [] }
function saveReports(r) { DB.set('reports', r); }
function getWatchHistory() { return DB.get('watch_history') || [] }
function saveWatchHistory(h) { DB.set('watch_history', h); }
function getNotifications() { return DB.get('notifications') || [] }
function saveNotifications(n) { DB.set('notifications', n); }
function getWatchData() { return DB.get('watch_data') || {} }
function setWatchData(w) { DB.set('watch_data', w); }
function getUserPremiumStatus(email) { const p = DB.get('premium_status') || {}; return p[email] || { plan: 'free', expiry: null }; }
function setUserPremiumStatus(email, plan, expiryDate) { 
    const p = DB.get('premium_status') || {}; 
    let expiry = null;
    if(expiryDate) expiry = expiryDate;
    else if(plan !== 'free' && plan !== 'guest') expiry = Date.now() + (plan === 'monthly' ? 30 : 365)*24*60*60*1000;
    p[email] = { plan: plan, expiry: expiry }; 
    DB.set('premium_status', p); 
}
function getUserRole(email) { const r = DB.get('user_roles') || {}; return r[email] || 'user'; }
function setUserRole(email, role) { const r = DB.get('user_roles') || {}; r[email] = role; DB.set('user_roles', r); }
function getCustomAnime() { return DB.get('custom_anime') || []; }
function saveCustomAnime(list) { DB.set('custom_anime', list); }
function generateRandomId() { return '#' + (Math.floor(100000 + Math.random() * 900000)).toString(); }

function getCurrentPlan() { 
    const cu = getCurrentUser(); 
    if(!cu) return 'guest'; 
    if(cu.email === 'admin@mywibu.app') return 'owner'; 
    const role = getUserRole(cu.email); 
    if(role === 'admin') return 'owner'; 
    const status = getUserPremiumStatus(cu.email); 
    if(status.expiry && status.expiry < Date.now()) { setUserPremiumStatus(cu.email, 'free', null); return 'free'; } 
    return status.plan; 
}

function addToHistory(anime) { 
    let h = getWatchHistory(); 
    h = h.filter(function(i) { return i.url !== anime.url; }); 
    h.unshift({ url: anime.url, title: anime.title, cover: anime.cover, timestamp: Date.now() }); 
    if(h.length > 50) h.pop(); 
    saveWatchHistory(h); 
}

// ========== FUNGSI SHOW LOGIN/REGISTER ==========
function showLogin() { 
    var loginForm = document.getElementById('login-form');
    var registerForm = document.getElementById('register-form');
    if(loginForm) loginForm.style.display = 'flex';
    if(registerForm) registerForm.style.display = 'none';
}

function showRegister() { 
    var loginForm = document.getElementById('login-form');
    var registerForm = document.getElementById('register-form');
    if(loginForm) loginForm.style.display = 'none';
    if(registerForm) registerForm.style.display = 'flex';
}

async function doLogin() { 
    var email = document.getElementById('login-email').value.trim(); 
    var pass = document.getElementById('login-password').value; 
    
    // Coba login via API dulu
    let result = await apiCall('login', { email: email, password: pass });
    
    if(result && result.status === 'ok'){
        // Update users lokal
        let users = getUsers();
        users[email] = result.user;
        saveUsers(users);
        setCurrentUser({ email: email, ...result.user });
        DB.del('guest_mode');
        document.getElementById('login-page').style.display = 'none';
        updateUserUI();
        initApp();
        showToast('Login berhasil!', 'info');
        return;
    }
    
    // Fallback ke local storage
    var users = getUsers(); 
    if(!users[email]) { alert('Email tidak terdaftar'); return; } 
    if(users[email].password !== pass) { alert('Password salah'); return; } 
    DB.del('guest_mode'); 
    setCurrentUser({ email: email, ...users[email] }); 
    document.getElementById('login-page').style.display = 'none'; 
    updateUserUI(); 
    initApp(); 
}

async function doRegister() { 
    var user = document.getElementById('reg-username').value.trim(); 
    var email = document.getElementById('reg-email').value.trim(); 
    var pass = document.getElementById('reg-password').value; 
    if(!user || !email || !pass) { alert('Lengkapi semua'); return; } 
    if(pass.length<6) { alert('Password min 6 karakter'); return; } 
    
    let result = await apiCall('register', { email: email, username: user, password: pass });
    
    if(result && result.status === 'ok'){
        let users = getUsers();
        users[email] = result.user;
        saveUsers(users);
        setCurrentUser({ email: email, ...result.user });
        document.getElementById('login-page').style.display = 'none';
        updateUserUI();
        initApp();
        showToast('Registrasi berhasil!', 'info');
        return;
    }
    
    // Fallback ke local storage
    var users = getUsers(); 
    if(users[email]) { alert('Email sudah terdaftar'); return; } 
    var randomId = generateRandomId();
    users[email] = { username: user, password: pass, avatar: null, xp: 0, level: 1, keys: 0, wibuGem: 0, userId: randomId, joinDate: Date.now(), episodeCount: 0 }; 
    saveUsers(users); 
    setUserPremiumStatus(email, 'free', null); 
    setCurrentUser({ email: email, ...users[email] }); 
    document.getElementById('login-page').style.display = 'none'; 
    updateUserUI(); 
    initApp(); 
}

function guestLogin() { DB.del('current_user'); DB.set('guest_mode',true); document.getElementById('login-page').style.display = 'none'; initApp(); showToast('Mode Tamu aktif - Maks 2 episode/anime, 480p','warning'); updateUserUIGuestMode(); showCommunityModal(); }
function guestLogout() { DB.del('guest_mode'); DB.del('current_user'); document.getElementById('login-page').style.display = 'flex'; location.reload(); }
function googleLogin() { window.open('about:blank', '_blank'); }

function ensureOwnerAccount() { 
    let u = getUsers(); 
    if(!u['admin@mywibu.app']) { 
        u['admin@mywibu.app'] = { username: 'Kawaki', password: 'KAWAICHAN9', avatar: null, xp: 999900, level: 9999, keys: 9999, wibuGem: 9999, userId: '#123456', joinDate: Date.now() }; 
        saveUsers(u); 
        setUserPremiumStatus('admin@mywibu.app','owner', null); 
        setUserRole('admin@mywibu.app','owner'); 
    } 
}

// ========== UPLOAD VIDEO ==========
function updateEpisodeFileInputs() {
    var count = parseInt(document.getElementById('upload-episode-count').value) || 1;
    var container = document.getElementById('episode-files-container');
    var listDiv = document.getElementById('episode-files-list');
    if(count > 1) {
        container.classList.remove('hidden');
        var html = '';
        for(var i = 0; i < count; i++) html += '<div class="flex gap-2 items-center"><label class="text-xs text-gray-400 w-24">Episode ' + (i+1) + ':</label><input type="file" id="episode-file-' + i + '" accept="video/mp4" class="input-field text-sm py-1 flex-1"></div>';
        listDiv.innerHTML = html;
    } else { container.classList.add('hidden'); }
}
document.getElementById('upload-episode-count')?.addEventListener('change', updateEpisodeFileInputs);

function uploadAnimeWithEpisodes() {
    if(!currentUserIsOwner()) { showToast('Hanya owner!', 'warning'); return; }
    var title = document.getElementById('upload-title').value.trim();
    var genre = document.getElementById('upload-genre').value;
    var newGenre = document.getElementById('upload-new-genre').value.trim();
    var cover = document.getElementById('upload-cover').value.trim();
    var episodeCount = parseInt(document.getElementById('upload-episode-count').value) || 1;
    if(!title) { showToast('Judul anime wajib!', 'warning'); return; }
    var finalGenre = newGenre || genre;
    if(!finalGenre) { showToast('Pilih atau buat genre!', 'warning'); return; }
    var episodes = [];
    for(var i = 0; i < episodeCount; i++) {
        var epFile = document.getElementById('episode-file-' + i);
        if(epFile && epFile.files[0]) { episodes.push({ ep: (i+1).toString(), url: URL.createObjectURL(epFile.files[0]), title: 'Episode ' + (i+1) }); }
        else { episodes.push({ ep: (i+1).toString(), url: '', title: 'Episode ' + (i+1) }); }
    }
    var newAnime = { id: Date.now(), judul: title, cover: cover || 'https://via.placeholder.com/300x400?text=No+Cover', genre: [finalGenre], episode: episodes, isCustom: true, url: 'custom_' + Date.now() };
    var customList = getCustomAnime();
    customList.push(newAnime);
    saveCustomAnime(customList);
    showToast('Berhasil upload anime "' + title + '" dengan ' + episodeCount + ' episode!', 'info');
    document.getElementById('upload-title').value = ''; document.getElementById('upload-cover').value = ''; document.getElementById('upload-episode-count').value = '1'; document.getElementById('episode-files-container').classList.add('hidden');
    loadAllData();
}

// ========== SISTEM KEY, IKLAN, LEVEL ==========
function getUserKeys(email) { var users = getUsers(); return (users[email] && users[email].keys !== undefined) ? users[email].keys : 0; }
function setUserKeys(email, keys) { var users = getUsers(); if(users[email]) { users[email].keys = keys; saveUsers(users); if(getCurrentUser() && getCurrentUser().email === email) { var cu = getCurrentUser(); cu.keys = keys; setCurrentUser(cu); } } }

// ========== AUTO SYNC USER STATS KE API ==========
async function syncUserStatsToAPI() {
    let cu = getCurrentUser();
    if (cu?.email) {
        await apiCall('updateUserStats', {
            email: cu.email,
            stats: {
                level: cu.level,
                xp: cu.xp,
                keys: cu.keys,
                wibuGem: cu.wibuGem
            }
        });
    }
}

// ========== SHOW IKLAN ==========
function showIklan(callback) { 
    var cu = getCurrentUser(); 
    if(!cu) { showToast('Login dulu untuk nonton iklan!', 'warning'); return false; } 
    var plan = getCurrentPlan(); 
    if(plan === 'premium' || plan === 'owner') { showToast('Premium user tidak perlu nonton iklan!', 'info'); return false; } 
    if(!checkAndResetIklanLimit()) { showToast('Sudah mencapai limit iklan hari ini (' + MAX_IKLAN_PER_HARI + ' iklan)!', 'warning'); return false; } 
    
    pendingEpisodeCallback = callback; 
    var randomIklan = IKLAN_ARRAY[Math.floor(Math.random() * IKLAN_ARRAY.length)]; 
    var modal = document.getElementById('iklan-modal'); 
    var video = document.getElementById('iklan-video'); 
    var countdownEl = document.getElementById('iklan-countdown'); 
    var skipBtn = document.getElementById('skip-iklan-btn'); 
    
    modal.classList.remove('hidden'); 
    video.src = randomIklan; 
    video.load(); 
    video.play(); 
    
    var secondsLeft = 5; 
    countdownEl.innerText = 'Iklan selesai dalam ' + secondsLeft + ' detik...'; 
    skipBtn.disabled = true; 
    skipBtn.style.pointerEvents = 'none'; 
    skipBtn.classList.add('opacity-50'); 
    
    var interval = setInterval(function() { 
        secondsLeft--; 
        if(secondsLeft <= 0) { 
            clearInterval(interval); 
            countdownEl.innerText = 'Klik tombol untuk lanjut'; 
            skipBtn.disabled = false; 
            skipBtn.style.pointerEvents = 'auto'; 
            skipBtn.classList.remove('opacity-50'); 
            skipBtn.innerText = 'Lanjutkan →'; 
        } else { 
            countdownEl.innerText = 'Iklan selesai dalam ' + secondsLeft + ' detik...'; 
        } 
    }, 1000); 
    window.currentIklanInterval = interval; 
    return true; 
}

function skipIklan() { 
    var video = document.getElementById('iklan-video'); 
    video.pause(); 
    var modal = document.getElementById('iklan-modal'); 
    modal.classList.add('hidden'); 
    if(window.currentIklanInterval) clearInterval(window.currentIklanInterval); 
    
    incrementIklanCount(); 
    var cu = getCurrentUser(); 
    if(cu) { 
        var currentKeys = getUserKeys(cu.email); 
        setUserKeys(cu.email, currentKeys + 1); 
        showToast('+1 Key! Sekarang kamu punya ' + (currentKeys + 1) + ' key', 'info'); 
        updateUserUI(); 
        syncUserStatsToAPI();
    } 
    if(pendingEpisodeCallback) { 
        pendingEpisodeCallback(true); 
        pendingEpisodeCallback = null; 
    } 
}

function checkAndResetIklanLimit() { 
    var today = new Date().toDateString(); 
    var saved = DB.get('iklan_data'); 
    if(!saved || saved.date !== today) { 
        DB.set('iklan_data', { date: today, count: 0 }); 
        todayIklanCount = 0; 
        return true; 
    } 
    todayIklanCount = saved.count; 
    return todayIklanCount < MAX_IKLAN_PER_HARI; 
}

function incrementIklanCount() { 
    var today = new Date().toDateString(); 
    var saved = DB.get('iklan_data') || { date: today, count: 0 }; 
    saved.count = (saved.count || 0) + 1; 
    DB.set('iklan_data', saved); 
    todayIklanCount = saved.count; 
}

function canWatchEpisode(animeUrl) { 
    var plan = getCurrentPlan(); 
    var cu = getCurrentUser(); 
    if(plan === 'owner') return true; 
    if(plan === 'premium') return true; 
    if(!cu) { 
        var gw = DB.get('guest_watch') || {}; 
        if(gw[animeUrl] >= 2) { 
            showToast('Mode Tamu: maks 2 episode/anime! Daftar untuk unlimited.', 'warning'); 
            return false; 
        } 
        return true; 
    } 
    var keys = getUserKeys(cu.email); 
    if(keys >= EPISODE_KEY_COST) return true; 
    else { 
        showToast('Key tidak cukup! Nonton iklan untuk dapat key gratis.', 'warning'); 
        return false; 
    } 
}

function useKey(animeUrl, animeTitle, animeCover) { 
    var plan = getCurrentPlan(); 
    var cu = getCurrentUser(); 
    if(plan === 'owner') return true; 
    if(plan === 'premium') return true; 
    if(!cu) return true; 
    
    var keys = getUserKeys(cu.email); 
    if(keys >= EPISODE_KEY_COST) { 
        setUserKeys(cu.email, keys - EPISODE_KEY_COST); 
        updateUserUI(); 
        
        var wd = getWatchData(); 
        if(!wd[animeUrl]) wd[animeUrl] = { title: animeTitle, cover: animeCover, count: 0 }; 
        wd[animeUrl].count++; 
        setWatchData(wd); 
        addToHistory({ url: animeUrl, title: animeTitle, cover: animeCover }); 
        
        var users = getUsers(); 
        if(users[cu.email]) { 
            var episodeCount = (users[cu.email].episodeCount || 0) + 1; 
            users[cu.email].episodeCount = episodeCount; 
            if(episodeCount >= EPISODE_PER_LEVEL_UP) { 
                users[cu.email].episodeCount = episodeCount - EPISODE_PER_LEVEL_UP; 
                var currentLevel = users[cu.email].level || 1; 
                var newLevel = currentLevel + LEVEL_GAIN_PER_EPISODE; 
                users[cu.email].level = newLevel; 
                users[cu.email].xp = newLevel * 100; 
                showToast('🎉 Selamat! Kamu naik ' + LEVEL_GAIN_PER_EPISODE + ' level! Level sekarang ' + newLevel, 'info'); 
            } 
            saveUsers(users); 
            setCurrentUser({ ...cu, ...users[cu.email] }); 
            updateUserUI(); 
            syncUserStatsToAPI();
        } 
        return true; 
    } 
    return false; 
}

// ========== OVERRIDE FUNGSI STORAGE KE API ==========
const originalSetWatchData = setWatchData;
window.setWatchData = function(w) {
    originalSetWatchData(w);
    let cu = getCurrentUser();
    if (cu?.email) {
        apiCall('updateWatchData', { email: cu.email, watchData: w });
    }
};

const originalSaveWatchHistory = saveWatchHistory;
window.saveWatchHistory = function(h) {
    originalSaveWatchHistory(h);
    let cu = getCurrentUser();
    if (cu?.email) {
        apiCall('syncHistory', { email: cu.email, history: h });
    }
};

// ========== OWNER FUNCTIONS - FIX ==========
async function addUserKey() { 
    if(!currentUserIsOwner()) { 
        showToast('Hanya owner!', 'warning'); 
        return; 
    } 
    var email = document.getElementById('key-user-email').value.trim(); 
    var amount = parseInt(document.getElementById('key-add-amount').value) || 0; 
    if(!email) { 
        showToast('Masukkan email!', 'warning'); 
        return; 
    } 
    if(amount <= 0) { 
        showToast('Jumlah key harus lebih dari 0!', 'warning'); 
        return; 
    }
    
    try {
        let result = await apiCall('addUserKey', { email: email, amount: amount });
        if(result && result.status === 'ok'){
            let users = getUsers();
            if(users[email]) {
                users[email].keys = (users[email].keys || 0) + amount;
                saveUsers(users);
                if(getCurrentUser()?.email === email){
                    let cu = getCurrentUser();
                    cu.keys = users[email].keys;
                    setCurrentUser(cu);
                }
            }
            showToast('Berhasil tambah ' + amount + ' key untuk ' + email, 'info'); 
            updateUserUI();
        } else {
            showToast('Gagal tambah key! ' + (result?.message || ''), 'error');
        }
    } catch(e) {
        showToast('Error: ' + e.message, 'error');
    }
    document.getElementById('key-user-email').value = ''; 
}

async function addUserLevel() { 
    if(!currentUserIsOwner()) { 
        showToast('Hanya owner!', 'warning'); 
        return; 
    } 
    var email = document.getElementById('key-user-email').value.trim(); 
    var amount = parseInt(document.getElementById('level-add-amount').value) || 0; 
    if(!email) { 
        showToast('Masukkan email!', 'warning'); 
        return; 
    } 
    if(amount <= 0) { 
        showToast('Jumlah level harus lebih dari 0!', 'warning'); 
        return; 
    }
    
    try {
        let result = await apiCall('addUserLevel', { email: email, amount: amount });
        if(result && result.status === 'ok'){
            let users = getUsers();
            if(users[email]) {
                users[email].level = (users[email].level || 1) + amount;
                users[email].xp = users[email].level * 100;
                saveUsers(users);
                if(getCurrentUser()?.email === email){
                    let cu = getCurrentUser();
                    cu.level = users[email].level;
                    cu.xp = users[email].xp;
                    setCurrentUser(cu);
                }
            }
            showToast('Berhasil tambah ' + amount + ' level untuk ' + email, 'info'); 
            updateUserUI();
        } else {
            showToast('Gagal tambah level!', 'error');
        }
    } catch(e) {
        showToast('Error: ' + e.message, 'error');
    }
    document.getElementById('key-user-email').value = ''; 
}

async function addUserGem() { 
    if(!currentUserIsOwner()) { 
        showToast('Hanya owner!', 'warning'); 
        return; 
    } 
    var email = document.getElementById('key-user-email').value.trim(); 
    var amount = parseInt(document.getElementById('gem-add-amount').value) || 0; 
    if(!email) { 
        showToast('Masukkan email!', 'warning'); 
        return; 
    } 
    if(amount <= 0) { 
        showToast('Jumlah WibuGem harus lebih dari 0!', 'warning'); 
        return; 
    }
    
    try {
        let result = await apiCall('addUserGem', { email: email, amount: amount });
        if(result && result.status === 'ok'){
            let users = getUsers();
            if(users[email]) {
                users[email].wibuGem = (users[email].wibuGem || 0) + amount;
                saveUsers(users);
                if(getCurrentUser()?.email === email){
                    let cu = getCurrentUser();
                    cu.wibuGem = users[email].wibuGem;
                    setCurrentUser(cu);
                }
            }
            showToast('Berhasil tambah ' + amount + ' WibuGem untuk ' + email, 'info'); 
            updateUserUI();
        } else {
            showToast('Gagal tambah WibuGem!', 'error');
        }
    } catch(e) {
        showToast('Error: ' + e.message, 'error');
    }
    document.getElementById('key-user-email').value = ''; 
}

async function assignRoleWithExpired() { 
    var email = document.getElementById('manage-email').value.trim(); 
    var role = document.getElementById('manage-role').value; 
    if(!email) { showToast('Masukkan email!','warning'); return; } 
    
    let users = getUsers();
    if(!users[email]) { showToast('User tidak ditemukan!','warning'); return; } 
    
    try {
        let roleResult = await apiCall('setUserRole', { email: email, role: role });
        let expiredDate = getExpiredDateFromDuration();
        
        if(role === 'premium') {
            await apiCall('setPremiumStatus', { email: email, plan: 'premium', expiry: expiredDate });
            setUserPremiumStatus(email, 'premium', expiredDate);
            if(expiredDate) {
                showToast(email+' sekarang '+role+' sampai '+new Date(expiredDate).toLocaleDateString(), 'info');
            } else {
                showToast(email+' sekarang '+role+' (no expired)', 'info');
            }
        } else if(role === 'admin') {
            showToast(email+' sekarang '+role, 'info');
        } else {
            await apiCall('setPremiumStatus', { email: email, plan: 'free', expiry: null });
            setUserPremiumStatus(email, 'free', null);
            showToast(email+' sekarang '+role, 'info');
        }
        
        if(roleResult?.status === 'ok'){
            setUserRole(email, role);
            renderRoleUsersList(); 
        }
    } catch(e) {
        showToast('Error: ' + e.message, 'error');
    }
    
    document.getElementById('manage-email').value = ''; 
    document.getElementById('expired-duration').value = 'none'; 
    document.getElementById('custom-expired-container').classList.add('hidden'); 
}

function addNotification(notif) { let n = getNotifications(); n.unshift({ ...notif, id: Date.now(), read: false, timestamp: Date.now() }); saveNotifications(n); updateNotificationBadge(); }
function sendBroadcastWithMedia() { 
    var title = document.getElementById('broadcast-title').value.trim(); 
    var msg = document.getElementById('broadcast-message').value.trim(); 
    if(!title || !msg) { showToast('Judul dan pesan wajib!','warning'); return; } 
    addNotification({ type:'broadcast', title:title, message:msg, sender: getCurrentUser()?.username || 'Owner' });
    showToast('Broadcast terkirim!','info'); 
    document.getElementById('broadcast-title').value = ''; 
    document.getElementById('broadcast-message').value = ''; 
}
function previewBroadcastMedia() { var file = document.getElementById('broadcast-media').files[0]; var preview = document.getElementById('media-preview'); if(!file) { preview.innerHTML = ''; return; } var reader = new FileReader(); reader.onload = function(e) { if(file.type.startsWith('image/')) preview.innerHTML = '<img src="'+e.target.result+'" class="media-preview">'; else if(file.type.startsWith('video/')) preview.innerHTML = '<video src="'+e.target.result+'" class="media-preview" controls></video>'; }; reader.readAsDataURL(file); }
document.getElementById('broadcast-media')?.addEventListener('change', previewBroadcastMedia);

function renderNotificationPanel() { var notifs = getNotifications(); var container = document.getElementById('notification-list'); if(!container) return; if(notifs.length===0) { container.innerHTML='<div class="p-4 text-center text-gray-500 text-xs">Tidak ada notifikasi</div>'; return; } container.innerHTML = notifs.slice(0,30).map(function(n) { var mediaHtml = ''; if(n.media) { if(n.isVideo) mediaHtml = '<video src="'+n.media+'" class="media-preview mt-2" controls></video>'; else mediaHtml = '<img src="'+n.media+'" class="media-preview mt-2">'; } return '<div class="p-3 '+(n.read?'opacity-70':'')+'" onclick="markNotificationRead('+n.id+')"><div class="flex gap-3"><i data-lucide="'+(n.type==='broadcast'?'megaphone':'bell')+'" class="w-4 h-4 text-amber-400"></i><div class="flex-1"><div class="font-semibold text-xs">'+n.title+'</div><div class="text-[10px] text-gray-400">'+n.message+'</div>'+mediaHtml+'<div class="text-[9px] text-gray-500 mt-1">'+new Date(n.timestamp).toLocaleString()+'</div></div>'+(n.read?'':'<div class="w-2 h-2 rounded-full bg-amber-400 mt-1"></div>')+'</div></div>'; }).join(''); lucide.createIcons(); }
function updateNotificationBadge() { var unread = getNotifications().filter(function(n){ return !n.read; }).length; var badge = document.getElementById('notification-count-badge'); if(unread>0) { badge.textContent = unread>9?'9+':unread; badge.classList.remove('hidden'); } else badge.classList.add('hidden'); }
function markNotificationRead(id) { let n = getNotifications(); let idx = n.findIndex(function(x){ return x.id===id; }); if(idx!==-1) { n[idx].read=true; saveNotifications(n); updateNotificationBadge(); renderNotificationPanel(); } }
function markAllNotificationsRead() { let n = getNotifications(); for(var i=0;i<n.length;i++) n[i].read=true; saveNotifications(n); updateNotificationBadge(); renderNotificationPanel(); }
var notifPanelOpen=false; function toggleNotificationPanel() { var p=document.getElementById('notification-panel'); if(notifPanelOpen) { p.classList.add('hidden'); notifPanelOpen=false; } else { renderNotificationPanel(); p.classList.remove('hidden'); notifPanelOpen=true; } }

function submitReportWithImage() { var isGuest = DB.get('guest_mode') === true; if(isGuest) { showToast('Guest tidak bisa mengirim laporan! Login atau daftar dulu.', 'warning'); return; } var type = document.getElementById('report-type').value; var title = document.getElementById('report-title').value.trim(); var desc = document.getElementById('report-desc').value.trim(); var screenshotFile = document.getElementById('report-screenshot').files[0]; if(!title || !desc) { showToast('Lengkapi semua!', 'warning'); return; } var cu = getCurrentUser(); var reporter = cu ? (cu.username || cu.email) : 'Unknown'; var reports = getReports(); var newReport = { id: Date.now(), type:type, title:title, desc:desc, reporter:reporter, date: new Date().toISOString(), status: 'pending' }; if(screenshotFile) { var reader = new FileReader(); reader.onload = function(e) { newReport.screenshot = e.target.result; reports.unshift(newReport); saveReports(reports); showToast('Laporan dengan screenshot terkirim!', 'info'); }; reader.readAsDataURL(screenshotFile); } else { reports.unshift(newReport); saveReports(reports); showToast('Laporan terkirim!', 'info'); } document.getElementById('report-title').value = ''; document.getElementById('report-desc').value = ''; document.getElementById('report-screenshot').value = ''; document.getElementById('screenshot-preview').innerHTML = ''; renderUserReports(); if(currentUserIsOwner()) renderAllReports(); }
function renderUserReports() { var cu = getCurrentUser(); var container = document.getElementById('user-reports-list'); if(!container) return; if(!cu) { container.innerHTML = '<div class="text-center text-gray-500 text-sm">Login untuk melacak laporan</div>'; return; } var reports = getReports().filter(function(r){ return r.reporter === (cu.username || cu.email); }); if(reports.length === 0) { container.innerHTML = '<div class="text-center text-gray-500 text-sm">Belum ada laporan</div>'; return; } var html = ''; for(var i=0;i<Math.min(10,reports.length);i++) { var r = reports[i]; var screenshotHtml = r.screenshot ? '<img src="'+r.screenshot+'" class="media-preview mt-2" style="max-height:100px">' : ''; html += '<div class="glass rounded-xl p-3"><div class="flex justify-between"><span class="text-[10px] text-amber-400">'+r.type+'</span><span class="text-[9px] '+(r.status==='pending'?'text-yellow-400':'text-green-400')+'">'+(r.status==='pending'?'Menunggu':'Selesai')+'</span></div><p class="text-xs font-semibold mt-1">'+r.title+'</p><p class="text-[10px] text-gray-500 mt-1">'+(r.desc||'').substring(0,100)+((r.desc||'').length>100?'...':'')+'</p>'+screenshotHtml+'<p class="text-[9px] text-gray-600 mt-2">'+new Date(r.date).toLocaleString()+'</p></div>'; } container.innerHTML = html; }
function renderAllReports() { var reports = getReports(); var container = document.getElementById('all-reports-list'); if(!container) return; if(reports.length===0) { container.innerHTML='<div class="text-center text-gray-500">Belum ada laporan</div>'; return; } var html = ''; for(var i=0;i<reports.length;i++) { var r = reports[i]; var screenshotHtml = r.screenshot ? '<img src="'+r.screenshot+'" class="media-preview mt-2" style="max-height:100px">' : ''; html += '<div class="glass rounded-xl p-3"><div class="flex justify-between"><span class="text-[10px] text-amber-400">'+r.type+'</span><span class="text-[9px] '+(r.status==='pending'?'text-yellow-400':'text-green-400')+'">'+r.status+'</span></div><p class="text-xs font-semibold">'+r.title+'</p><p class="text-[10px] text-gray-500">'+r.reporter+' - '+new Date(r.date).toLocaleString()+'</p>'+screenshotHtml+'<div class="flex gap-2 mt-2"><button onclick="updateReportStatus('+r.id+',\'resolved\')" class="text-[10px] bg-green-500/20 px-2 py-1 rounded">Selesai</button><button onclick="updateReportStatus('+r.id+',\'pending\')" class="text-[10px] bg-yellow-500/20 px-2 py-1 rounded">Pending</button></div></div>'; } container.innerHTML = html; }
function updateReportStatus(id, status) { let reports = getReports(); let idx = reports.findIndex(function(r){ return r.id===id; }); if(idx!==-1) { reports[idx].status=status; saveReports(reports); renderAllReports(); showToast('Status diupdate','info'); } }

function isOwner(email) { return email === 'admin@mywibu.app'; }
function currentUserIsOwner() { var cu = getCurrentUser(); return cu && cu.email === 'admin@mywibu.app'; }
function currentUserIsAdmin() { var cu = getCurrentUser(); if(!cu) return false; return getUserRole(cu.email) === 'admin' || cu.email === 'admin@mywibu.app'; }
function toggleCustomExpired() { var val = document.getElementById('expired-duration').value; var customDiv = document.getElementById('custom-expired-container'); if(val === 'custom') customDiv.classList.remove('hidden'); else customDiv.classList.add('hidden'); }
function getExpiredDateFromDuration() { var duration = document.getElementById('expired-duration').value; var customDays = document.getElementById('custom-days')?.value; var days = 0; if(duration === '1day') days = 1; else if(duration === '1week') days = 7; else if(duration === '1month') days = 30; else if(duration === '1year') days = 365; else if(duration === 'custom') days = parseInt(customDays) || 0; else return null; if(days <= 0) return null; return Date.now() + (days * 24 * 60 * 60 * 1000); }

function renderRoleUsersList() { var users = getUsers(); var roleData = DB.get('user_roles')||{}; var premiumData = DB.get('premium_status')||{}; var admins = []; var premiums = []; for(var e in users) { if(roleData[e]==='admin' || e==='admin@mywibu.app') admins.push([e, users[e]]); if(roleData[e]==='premium') premiums.push([e, users[e]]); } var container = document.getElementById('role-users-list'); if(!container) return; var adminHtml = '<div class="glass rounded-xl p-3 mb-2"><div class="text-[10px] text-gray-500">ADMIN</div>'; for(var i=0;i<admins.length;i++) { var e = admins[i][0], u = admins[i][1]; adminHtml += '<div class="flex items-center gap-2 py-1"><i data-lucide="shield" class="w-3 h-3 text-amber-400"></i><span class="text-xs">'+(u.username||e)+'</span></div>'; } if(admins.length === 0) adminHtml += '<div class="text-xs text-gray-500">Tidak ada admin</div>'; adminHtml += '</div>'; var premiumHtml = '<div class="glass rounded-xl p-3"><div class="text-[10px] text-gray-500">PREMIUM</div>'; for(var i=0;i<premiums.length;i++) { var e = premiums[i][0], u = premiums[i][1]; var status = premiumData[e] || {}; var expiryText = status.expiry ? 'exp: '+new Date(status.expiry).toLocaleDateString() : 'no expired'; premiumHtml += '<div class="flex items-center gap-2 py-1"><i data-lucide="diamond" class="w-3 h-3 text-yellow-400"></i><span class="text-xs">'+(u.username||e)+'</span><span class="text-[9px] text-gray-500">('+expiryText+')</span></div>'; } if(premiums.length === 0) premiumHtml += '<div class="text-xs text-gray-500">Tidak ada premium</div>'; premiumHtml += '</div>'; container.innerHTML = adminHtml + premiumHtml; lucide.createIcons(); }

// ========== BADGE & LEVEL ==========
var BADGES = [{min:1,max:10,label:'Pemula Wibu'},{min:11,max:20,label:'Junior Wibu'},{min:21,max:30,label:'Senior Wibu'},{min:31,max:40,label:'CanduWibu'},{min:41,max:50,label:'SenkuWibu'},{min:51,max:60,label:'WlifeWibu'},{min:61,max:70,label:'Sensei'},{min:71,max:80,label:'WibuAkut'},{min:81,max:90,label:'KingWibu'},{min:91,max:200,label:'LegendWibu'},{min:999,max:Infinity,label:'GOD WIBU'}];
function getBadge(level) { for(var i=0;i<BADGES.length;i++) { if(level >= BADGES[i].min && level <= BADGES[i].max) return BADGES[i]; } return BADGES[0]; }
function getXPProgress(totalXP) { var xp=totalXP, lv=1; while(xp >= lv*100) { xp -= lv*100; lv++; } return { level: lv, current: xp, needed: lv*100 }; }

// ========== HOME PAGE FUNCTIONS ==========
function renderHomeProfile() {
    var cu = getCurrentUser();
    var isGuest = DB.get('guest_mode') === true;
    if(isGuest) {
        document.getElementById('home-username').innerHTML = 'Guest Mode';
        document.getElementById('home-badge').innerHTML = 'Tamu';
        document.getElementById('home-level').innerHTML = 'Lvl. 1';
        document.getElementById('home-exp').innerHTML = 'Exp 0/100';
        document.getElementById('home-wibu-gem').innerHTML = '0';
        document.getElementById('home-key').innerHTML = '0';
        lucide.createIcons();
        return;
    }
    if(cu) {
        var username = cu.username || cu.email.split('@')[0];
        var level = cu.level || 1;
        var xp = cu.xp || (level * 100);
        var wibuGem = cu.wibuGem || 0;
        var keys = cu.keys || 0;
        var avatar = cu.avatar;
        var progress = getXPProgress(xp);
        var currentLevel = progress.level;
        var currentExp = progress.current;
        var neededExp = progress.needed;
        var badgeLabel = getBadge(currentLevel).label;
        document.getElementById('home-username').innerHTML = username;
        document.getElementById('home-badge').innerHTML = badgeLabel;
        document.getElementById('home-level').innerHTML = 'Lvl. '+currentLevel;
        document.getElementById('home-exp').innerHTML = 'Exp '+currentExp+'/'+neededExp;
        document.getElementById('home-wibu-gem').innerHTML = wibuGem;
        document.getElementById('home-key').innerHTML = keys;
        var homeAvatarImg = document.getElementById('home-avatar-img');
        var homeAvatarIcon = document.getElementById('home-avatar')?.querySelector('i');
        if(avatar) {
            homeAvatarImg.src = avatar;
            homeAvatarImg.classList.remove('hidden');
            if(homeAvatarIcon) homeAvatarIcon.classList.add('hidden');
        } else {
            homeAvatarImg.classList.add('hidden');
            if(homeAvatarIcon) homeAvatarIcon.classList.remove('hidden');
        }
    }
    lucide.createIcons();
}

function renderAccountPage() {
    var cu = getCurrentUser();
    if(!cu) { switchPage('home'); return; }
    document.getElementById('account-username').innerHTML = cu.username || cu.email.split('@')[0];
    document.getElementById('account-id').innerHTML = cu.userId || '#000000';
    var level = cu.level || 1;
    var xp = cu.xp || (level * 100);
    var progress = getXPProgress(xp);
    document.getElementById('account-level').innerHTML = 'Lvl. '+progress.level;
    document.getElementById('account-exp').innerHTML = 'Exp '+progress.current+'/'+progress.needed;
    document.getElementById('account-stats-komentar').innerHTML = cu.totalKomentar || 0;
    document.getElementById('account-stats-bulan').innerHTML = cu.bergabungBulan || Math.floor((Date.now() - (cu.joinDate||Date.now()))/(1000*60*60*24*30)) || 0;
    document.getElementById('account-stats-teman').innerHTML = cu.totalTeman || 0;
    document.getElementById('account-stats-pet').innerHTML = cu.petCount || 0;
    var avatar = cu.avatar;
    var accountAvatarImg = document.getElementById('account-avatar-img');
    var accountAvatarIcon = document.getElementById('account-avatar-icon');
    if(avatar) {
        accountAvatarImg.src = avatar;
        accountAvatarImg.classList.remove('hidden');
        if(accountAvatarIcon) accountAvatarIcon.classList.add('hidden');
    } else {
        accountAvatarImg.classList.add('hidden');
        if(accountAvatarIcon) accountAvatarIcon.classList.remove('hidden');
    }
    var history = getWatchHistory();
    var historyContainer = document.getElementById('account-history-list');
    if(historyContainer) {
        if(history.length === 0) historyContainer.innerHTML = '<div class="text-center text-gray-500 text-sm py-10">Belum ada riwayat tontonan</div>';
        else { var historyHtml = ''; for(var i=0;i<Math.min(10,history.length);i++) { var h = history[i]; historyHtml += '<div class="glass rounded-xl p-3 cursor-pointer" onclick="loadDetail(\''+h.url+'\')"><div class="flex gap-3"><img class="w-12 h-16 object-cover rounded-lg" src="'+h.cover+'" onerror="this.src=\'https://via.placeholder.com/300x400?text=Error\'"><div><div class="text-sm font-semibold">'+h.title+'</div><div class="text-[9px] text-gray-500">'+new Date(h.timestamp).toLocaleString()+'</div></div></div></div>'; } historyContainer.innerHTML = historyHtml; }
    }
}

function switchAccountTab(tab) {
    var tabs = document.querySelectorAll('.account-tab');
    for(var i=0;i<tabs.length;i++) { tabs[i].classList.remove('active'); tabs[i].classList.add('text-gray-400'); }
    var activeTab = document.querySelector('.account-tab[data-tab="'+tab+'"]');
    if(activeTab) { activeTab.classList.add('active'); activeTab.classList.remove('text-gray-400'); activeTab.classList.add('text-amber-400'); }
    var contents = document.querySelectorAll('.account-tab-content');
    for(var i=0;i<contents.length;i++) contents[i].classList.add('hidden');
    if(tab === 'semua') document.getElementById('account-tab-semua').classList.remove('hidden');
    else if(tab === 'komentar') document.getElementById('account-tab-komentar').classList.remove('hidden');
    else if(tab === 'riwayat') document.getElementById('account-tab-riwayat').classList.remove('hidden');
}

function renderViralAnime() {
    var wd = getWatchData();
    var viral = [];
    for(var url in wd) viral.push({ url: url, title: wd[url].title, cover: wd[url].cover, count: wd[url].count });
    viral.sort(function(a,b){ return b.count - a.count; }); viral = viral.slice(0,5);
    var container = document.getElementById('viral-anime-list');
    if(!container) return;
    if(viral.length === 0) { container.innerHTML = '<div class="text-center text-gray-500 text-xs py-4">Belum ada data viral</div>'; return; }
    var html = '';
    for(var i = 0; i < viral.length; i++) { var a = viral[i]; var rankClass = i === 0 ? 'rank-1' : (i === 1 ? 'rank-2' : (i === 2 ? 'rank-3' : 'rank-other')); html += '<div class="flex items-center gap-3 glass rounded-xl p-2 cursor-pointer" onclick="loadDetail(\''+a.url.replace(/'/g,"\\'")+'\')"><div class="w-8 h-8 rounded-full '+rankClass+' flex items-center justify-center text-white font-bold text-xs">#'+(i+1)+'</div><img class="w-10 h-14 object-cover rounded-lg" src="'+a.cover+'" onerror="this.src=\'https://via.placeholder.com/300x400?text=Error\'"><div class="flex-1 text-left"><div class="text-xs font-semibold line-clamp-1">'+a.title+'</div><div class="text-[9px] text-gray-400">'+a.count+' tontonan</div></div></div>'; }
    container.innerHTML = html;
}

// ========== TOP GLOBAL - PUBLIC (BISA DILIHAT SEMUA USER) ==========
async function renderTopGlobalUsersCarousel() {
    let res = await apiCall('getAllUsers');
    let users = res?.users || getUsers();
    let sorted = [];
    for (var e in users) {
        if (users[e]) {
            sorted.push({
                email: e,
                username: users[e].username || e.split('@')[0],
                level: users[e].level || 1,
                xp: users[e].xp || 0,
                avatar: users[e].avatar,
                userId: users[e].userId
            });
        }
    }
    sorted.sort((a,b) => b.xp - a.xp);
    sorted = sorted.slice(0,10);
    let container = document.getElementById('top-global-users-carousel');
    if(!container) return;
    if(sorted.length === 0) { container.innerHTML = '<div class="text-center text-gray-500 text-xs py-4">Belum ada user</div>'; return; }
    var html = '';
    for(var i = 0; i < sorted.length; i++) { 
        var u = sorted[i]; 
        var rankClass = i === 0 ? 'rank-1' : (i === 1 ? 'rank-2' : (i === 2 ? 'rank-3' : 'rank-other')); 
        var badge = getBadge(u.level); 
        html += '<div class="flex items-center gap-3 glass rounded-xl p-2 cursor-pointer" onclick="switchPage(\'account\')"><div class="w-8 h-8 rounded-full '+rankClass+' flex items-center justify-center text-white font-bold text-xs">#'+(i+1)+'</div><div class="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center overflow-hidden">'+(u.avatar ? '<img src="'+u.avatar+'" class="w-full h-full object-cover">' : '<i data-lucide="user" class="w-4 h-4 text-white"></i>')+'</div><div class="flex-1 text-left"><div class="text-xs font-semibold">'+(u.username)+'</div><div class="text-[8px] text-amber-400">'+badge.label+'</div><div class="text-[8px] text-gray-500 font-mono">'+ (u.userId || '#XXXXXX') +'</div></div><div class="text-right"><div class="text-xs font-bold text-amber-400">Lvl '+u.level+'</div><div class="text-[8px] text-gray-500">'+(u.xp||0)+' XP</div></div></div>'; 
    }
    container.innerHTML = html; 
    lucide.createIcons(); 
}

async function renderTopUsersList() {
    let res = await apiCall('getAllUsers');
    let users = res?.users || getUsers();
    var sorted = [];
    for(var e in users) {
        if (users[e]) {
            sorted.push({
                email: e,
                username: users[e].username || e.split('@')[0],
                level: users[e].level || 1,
                xp: users[e].xp || 0,
                avatar: users[e].avatar,
                userId: users[e].userId
            });
        }
    }
    sorted.sort((a,b) => b.xp - a.xp);
    sorted = sorted.slice(0,20);
    var container = document.getElementById('top-global-users-list');
    if(!container) return;
    var html = '';
    for(var i=0;i<sorted.length;i++) { 
        var u = sorted[i]; 
        var rankClass = i===0?'rank-1':i===1?'rank-2':i===2?'rank-3':'rank-other'; 
        var badge = getBadge(u.level); 
        html += '<div class="flex items-center gap-3 glass rounded-2xl p-3 cursor-pointer" onclick="switchPage(\'account\')"><div class="w-9 h-9 rounded-xl '+rankClass+' flex items-center justify-center text-white font-black">'+(i+1)+'</div><div class="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center overflow-hidden">'+(u.avatar ? '<img src="'+u.avatar+'" class="w-full h-full object-cover">' : '<i data-lucide="user" class="w-5 h-5 text-white"></i>')+'</div><div class="flex-1"><div class="font-semibold text-sm">'+(u.username)+'</div><div class="badge-pill bg-amber-500/20 text-amber-400">'+badge.label+'</div><div class="text-[9px] text-gray-500 font-mono">'+(u.userId||'#XXXXXX')+'</div></div><div class="text-right"><div class="text-sm font-bold text-amber-400">Lvl '+u.level+'</div><div class="text-[10px] text-gray-500">'+(u.xp||0)+' XP</div></div></div>'; 
    }
    container.innerHTML = html; 
    lucide.createIcons(); 
}

function toggleFaq(element) { var faqItem = element.closest('.faq-item'); var answer = faqItem.querySelector('.faq-answer'); var icon = faqItem.querySelector('.faq-question i'); if(answer.classList.contains('open')) { answer.classList.remove('open'); if(icon) icon.classList.remove('rotate-180'); } else { answer.classList.add('open'); if(icon) icon.classList.add('rotate-180'); } }

function updateUserUI() {
    var cu = getCurrentUser(); var isGuest = DB.get('guest_mode')===true;
    var guestLogoutBtn = document.getElementById('guest-logout-container');
    var reportGuestWarning = document.getElementById('report-guest-warning');
    if(reportGuestWarning) { if(isGuest) reportGuestWarning.innerHTML = 'Kamu mengirim sebagai guest. Login untuk melacak status laporan.'; else reportGuestWarning.innerHTML = 'Terima kasih sudah melapor! Tim kami akan segera memproses.'; }
    if(!cu && !isGuest) { document.getElementById('sidebar-username').innerHTML='Guest'; document.getElementById('owner-menu').classList.add('hidden'); if(guestLogoutBtn) guestLogoutBtn.classList.add('hidden'); return; }
    if(isGuest) { document.getElementById('sidebar-username').innerHTML = 'Guest Mode'; document.getElementById('sidebar-badge').innerHTML = 'Tamu'; if(guestLogoutBtn) guestLogoutBtn.classList.remove('hidden'); document.getElementById('owner-menu').classList.add('hidden'); lucide.createIcons(); renderHomeProfile(); showCommunityModal(); return; }
    if(guestLogoutBtn) guestLogoutBtn.classList.add('hidden');
    var username = cu.username || cu.email.split('@')[0]; var avatar = cu.avatar; var level = cu.level || 1; var xp = cu.xp || (level * 100); var progress = getXPProgress(xp); var badge = getBadge(progress.level);
    var isOwnerUser = cu && cu.email==='admin@mywibu.app'; var isAdminUser = cu && getUserRole(cu.email)==='admin';
    var nameHTML = username; if(isOwnerUser) nameHTML += ' <i data-lucide="badge-check" class="w-4 h-4 inline verified-owner"></i>'; else if(isAdminUser) nameHTML += ' <i data-lucide="badge-check" class="w-4 h-4 inline verified-admin"></i>';
    document.getElementById('sidebar-username').innerHTML = nameHTML;
    var simg = document.getElementById('sidebar-avatar-img'); var sicon = document.getElementById('sidebar-avatar-icon')?.parentElement.querySelector('i');
    if(avatar) { simg.src = avatar; simg.classList.remove('hidden'); if(sicon) sicon.classList.add('hidden'); } else { simg.classList.add('hidden'); if(sicon) sicon.classList.remove('hidden'); }
    document.getElementById('sidebar-badge').innerHTML = badge.label;
    var headerAvatarImg = document.getElementById('header-avatar-img'); var headerAvatarIcon = document.getElementById('header-avatar-icon');
    if(headerAvatarImg && headerAvatarIcon) { if(avatar) { headerAvatarImg.src = avatar; headerAvatarImg.classList.remove('hidden'); headerAvatarIcon.classList.add('hidden'); } else { headerAvatarImg.classList.add('hidden'); headerAvatarIcon.classList.remove('hidden'); } }
    var premiumDiv = document.getElementById('sidebar-premium-badge'); var plan = getCurrentPlan();
    if(plan==='monthly') { premiumDiv.classList.remove('hidden'); premiumDiv.innerHTML='<div class="badge-pill bg-amber-500/30 text-amber-400"><i data-lucide="diamond" class="w-3 h-3 inline"></i> PREMIUM MONTHLY</div>'; }
    else if(plan==='yearly') { premiumDiv.classList.remove('hidden'); premiumDiv.innerHTML='<div class="badge-pill bg-amber-500/30 text-amber-400"><i data-lucide="diamond" class="w-3 h-3 inline"></i> PREMIUM YEARLY</div>'; }
    else if(plan==='owner') { premiumDiv.classList.remove('hidden'); premiumDiv.innerHTML='<div class="badge-pill bg-amber-500/30 text-amber-400"><i data-lucide="crown" class="w-3 h-3 inline"></i> OWNER</div>'; }
    else premiumDiv.classList.add('hidden');
    document.getElementById('owner-menu').classList.toggle('hidden', !isOwnerUser);
    lucide.createIcons(); updateNotificationBadge(); renderHomeProfile(); renderViralAnime(); renderTopGlobalUsersCarousel();
    if(currentPage === 'premium') renderPremiumPage();
    if(currentPage === 'account') renderAccountPage();
    showCommunityModal();
}
function renderPremiumPage() { var plan = getCurrentPlan(); var container = document.getElementById('current-plan-container'); var planName = 'Free'; if(plan==='monthly') planName='Premium Bulanan'; else if(plan==='yearly') planName='Premium Tahunan'; else if(plan==='owner') planName='OWNER'; if(container) container.innerHTML = '<div class="mt-4 text-center text-xs text-gray-500">Paket Saat Ini: <span class="text-amber-400">'+planName+'</span></div>'; }
function upgradeToPremium(plan) {
    var cu = getCurrentUser();
    if(!cu) { showToast('Login dulu!','warning'); return; }
    if(cu.email === 'admin@mywibu.app') { showToast('Owner sudah punya akses penuh','warning'); return; }
    window.location.href = 'https://t.me/youknowkawaki';
}
function updateUserUIGuestMode() { var isGuest = DB.get('guest_mode')===true; var guestLogoutBtn = document.getElementById('guest-logout-container'); if(isGuest) { document.getElementById('sidebar-username').innerHTML = 'Guest Mode'; document.getElementById('sidebar-badge').innerHTML = 'Tamu'; if(guestLogoutBtn) guestLogoutBtn.classList.remove('hidden'); } else { if(guestLogoutBtn) guestLogoutBtn.classList.add('hidden'); } lucide.createIcons(); }
function doLogout() { DB.del('current_user'); DB.del('guest_mode'); location.reload(); }

function renderTopAnimeList() { var top = getTopGlobal(); var container = document.getElementById('top-global-list'); if(!container) return; if(!top.length) { container.innerHTML='<div class="text-center text-gray-500">Belum ada data tontonan</div>'; return; } var html = ''; for(var i=0;i<top.length;i++) { var a = top[i]; var rankClass = i===0?'rank-1':i===1?'rank-2':i===2?'rank-3':'rank-other'; html += '<div class="flex items-center gap-3 glass rounded-2xl p-3 cursor-pointer" onclick="loadDetail(\''+a.url.replace(/'/g,"\\'")+'\')"><div class="w-9 h-9 rounded-xl '+rankClass+' flex items-center justify-center text-white font-black">'+(i+1)+'</div><img class="w-12 h-16 object-cover rounded-xl" src="'+a.cover+'" onerror="this.src=\'https://via.placeholder.com/300x400?text=Error\'"><div class="flex-1"><div class="font-semibold text-sm">'+a.title+'</div><div class="text-[11px] text-gray-400">'+a.count+' views</div></div></div>'; } container.innerHTML = html; }
function renderHistory() { var history = getWatchHistory(); var container = document.getElementById('history-list'); if(!container) return; if(!history.length) { container.innerHTML='<div class="col-span-full text-center text-gray-500">Belum ada riwayat</div>'; return; } var html = ''; for(var i=0;i<Math.min(20,history.length);i++) { var a = history[i]; html += '<div class="cursor-pointer" onclick="loadDetail(\''+(a.url||'').replace(/'/g,"\\'")+'\')"><div class="rounded-2xl overflow-hidden aspect-[3/4] bg-surface"><img class="w-full h-full object-cover" src="'+a.cover+'" onerror="this.src=\'https://via.placeholder.com/300x400?text=Error\'"></div><div class="text-xs line-clamp-2 mt-1">'+a.title+'</div></div>'; } container.innerHTML = html; }
function getTopGlobal() { var wd = getWatchData(); var result = []; for(var url in wd) result.push({ url: url, title: wd[url].title, cover: wd[url].cover, count: wd[url].count }); result.sort(function(a,b){ return b.count - a.count; }); return result.slice(0,20); }

// ========== SETTINGS ==========
function openSettings() { document.getElementById('settings-sheet').classList.add('open'); document.getElementById('overlay').classList.add('opacity-100','visible'); renderSettingsContent(); }
function closeSettings() { document.getElementById('settings-sheet').classList.remove('open'); document.getElementById('overlay').classList.remove('opacity-100','visible'); }
function renderSettingsContent() { var cu = getCurrentUser(); if(!cu) { closeSettings(); return; } var html = '<div class="flex flex-col items-center gap-4"><div class="w-24 h-24 rounded-full overflow-hidden ring-4 ring-amber-500/50"><img src="'+(cu.avatar||'https://files.catbox.moe/jwbvn2.jpg')+'" class="w-full h-full object-cover"></div><button onclick="triggerAvatarUpload()" class="text-amber-400 text-sm">Ganti Avatar</button><input type="file" id="avatar-upload" class="hidden" accept="image/*" onchange="handleAvatarChange(event)"><div class="w-full"><label class="text-xs text-gray-500">Username</label><input id="settings-username" class="input-field mt-1" value="'+(cu.username||'')+'"></div><div class="w-full"><label class="text-xs text-gray-500">Email</label><input id="settings-email" class="input-field mt-1" value="'+(cu.email||'')+'"></div><div class="w-full"><label class="text-xs text-gray-500">Password Baru</label><input id="settings-password" class="input-field mt-1" type="password" placeholder="Kosongkan jika tidak diubah"></div><button class="btn-primary" onclick="saveSettings()">Simpan Perubahan</button><button class="w-full py-3 rounded-2xl bg-red-500/20 text-red-400" onclick="doLogout()">Logout</button></div>'; document.getElementById('settings-content').innerHTML = html; lucide.createIcons(); }
function triggerAvatarUpload() { document.getElementById('avatar-upload')?.click(); }
function handleAvatarChange(e) { var file = e.target.files[0]; if(!file) return; var reader = new FileReader(); reader.onload = function(ev) { var cu = getCurrentUser(); if(!cu) return; var users = getUsers(); if(users[cu.email]) users[cu.email].avatar = ev.target.result; saveUsers(users); setCurrentUser({...cu, avatar: ev.target.result}); updateUserUI(); renderSettingsContent(); showToast('Avatar berhasil diubah!'); }; reader.readAsDataURL(file); }
function saveSettings() { var cu = getCurrentUser(); if(!cu) return; var newUsername = document.getElementById('settings-username')?.value.trim(); var newEmail = document.getElementById('settings-email')?.value.trim(); var newPass = document.getElementById('settings-password')?.value; if(!newUsername) { showToast('Username tidak boleh kosong','warning'); return; } var users = getUsers(); if(newEmail && newEmail !== cu.email) { if(users[newEmail]) { showToast('Email sudah digunakan','warning'); return; } delete users[cu.email]; users[newEmail] = { ...users[cu.email], username: newUsername }; saveUsers(users); if(newPass && newPass.length>=6) users[newEmail].password = newPass; setCurrentUser({ email: newEmail, ...users[newEmail] }); } else { users[cu.email].username = newUsername; if(newPass && newPass.length>=6) users[cu.email].password = newPass; saveUsers(users); setCurrentUser({ ...cu, username: newUsername }); } updateUserUI(); renderSettingsContent(); showToast('Profil berhasil diupdate!'); }

// ========== API CONFIG ==========
var API_CONFIG_2 = { primary: { name:'NefuSoft', baseURL:'https://dev.nefusoft.cloud', endpoints:{ latest:'/latest?page=1', schedule:'/schedule', movies:'/movies', detail:'/detail?url=', episode:'/episode?url=' } }, secondary: { name:'Subnime', baseURL:'https://subnime.id', useProxy:true, proxyURL:'https://api.allorigins.win/raw?url=', endpoints:{ latest:'/', detail:'/anime/' } } };
var CURRENT_API = 'primary';
async function fetchWithTimeout(url, timeout) { timeout = timeout || 10000; var c = new AbortController(); var id = setTimeout(function(){c.abort();},timeout); try { var r = await fetch(url, { signal:c.signal }); clearTimeout(id); return r; } catch(e) { clearTimeout(id); throw e; } }
async function fetchWithFallback(endpoint, params) { params = params || {}; var cfg = API_CONFIG_2[CURRENT_API]; try { var url=''; if(CURRENT_API === 'primary') { if(endpoint==='detail') url = cfg.baseURL+cfg.endpoints.detail+encodeURIComponent(params.url); else if(endpoint==='episode') url = cfg.baseURL+cfg.endpoints.episode+encodeURIComponent(params.url)+'&reso='+(params.reso||'720p'); else url = cfg.baseURL+cfg.endpoints[endpoint]; var res = await fetchWithTimeout(url); if(!res.ok) throw new Error(); var data = await res.json(); return data; } else { if(endpoint==='latest') { var proxy = cfg.proxyURL+encodeURIComponent(cfg.baseURL+cfg.endpoints.latest); var html = await (await fetchWithTimeout(proxy)).text(); var parser = new DOMParser(); var doc = parser.parseFromString(html,'text/html'); var items = doc.querySelectorAll('.anime-list-item, .list-update-item'); var list = []; items.forEach(function(el) { var judul = el.querySelector('h3')?.innerText?.trim() || ''; var link = el.querySelector('a')?.href || ''; var cover = el.querySelector('img')?.src || ''; if(judul && link) list.push({ judul: judul, url: link, cover: cover, genre:[] }); }); return list; } else if(endpoint==='detail') { var detailUrl = params.url.startsWith('http') ? params.url : cfg.baseURL+'/anime/'+params.url; var proxy = cfg.proxyURL+encodeURIComponent(detailUrl); var html = await (await fetchWithTimeout(proxy)).text(); var doc = new DOMParser().parseFromString(html,'text/html'); var title = doc.querySelector('h1')?.innerText || 'Unknown'; var cover = doc.querySelector('img.attachment-large')?.src || ''; var sinopsis = doc.querySelector('.sinopsis')?.innerText || 'Tidak ada sinopsis'; var eps = []; var epsItems = doc.querySelectorAll('.eps-item a'); for(var i=0;i<epsItems.length;i++) { var a = epsItems[i]; eps.push({ url:a.href, ch:a.innerText.trim() || 'Episode '+(i+1) }); } return { data:[{ judul:title, cover:cover, sinopsis:sinopsis, chapter:eps, rating:'N/A', status:'Ongoing' }] }; } return { data:[] }; } } catch(e) { if(CURRENT_API === 'primary') { CURRENT_API = 'secondary'; document.getElementById('api-badge').innerText = 'API: SECONDARY (Subnime)'; showToast('Primary API error, beralih ke secondary','warning'); return fetchWithFallback(endpoint, params); } return { data:[] }; } }

// ========== RENDER FUNCTIONS ==========
var latestData=[], scheduleData=[], moviesData=[], allAnime=[], animeListGrouped={}, currentPage='home', currentDay=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][new Date().getDay()], currentBrowseKey='A', currentBrowsePage=1, currentMoviesPage=1, ITEMS_PER_PAGE=20, isLoadingComplete=false, swiperInstance=null;

function renderHorizontalCards(list, container) { if(!list.length) { container.innerHTML='<div class="text-center text-gray-500">Tidak ada data</div>'; return; } var html=''; for(var i=0;i<list.length;i++) { var a=list[i]; html+='<div class="anime-card flex-shrink-0 w-32 cursor-pointer" onclick="loadDetail(\''+(a.url||'').replace(/'/g,"\\'")+'\')"><div class="rounded-2xl overflow-hidden aspect-[3/4] bg-surface shadow-lg shadow-amber-500/20"><img class="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src="'+a.cover+'" onerror="this.src=\'https://via.placeholder.com/300x400?text=Error\'" loading="lazy"></div><div class="text-xs font-medium line-clamp-2 mt-1">'+a.judul+'</div></div>'; } container.innerHTML=html; }
function renderGridCard(a) { return '<div class="anime-card cursor-pointer" onclick="loadDetail(\''+(a.url||'').replace(/'/g,"\\'")+'\')"><div class="rounded-2xl overflow-hidden aspect-[3/4] bg-surface shadow-lg shadow-amber-500/20"><img class="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src="'+a.cover+'" onerror="this.src=\'https://via.placeholder.com/300x400?text=Error\'" loading="lazy"></div><div class="text-sm font-medium line-clamp-2 mt-1">'+a.judul+'</div></div>'; }

async function loadAllData() { if(isLoadingComplete) return; isLoadingComplete=true; try { var latest=await fetchWithFallback('latest'); latestData = latest; var schedule=await fetchWithFallback('schedule').catch(function(){return {data:[]};}); scheduleData = schedule.data || []; var movies=await fetchWithFallback('movies').catch(function(){return [];}); moviesData = movies; var customList = getCustomAnime(); var map=new Map(); var add=function(a){ if(a && a.url && !map.has(a.url)) map.set(a.url, { judul:a.judul||'Unknown', cover:a.cover||'', url:a.url, genre:a.genre||[] }); }; for(var i=0;i<latestData.length;i++) add(latestData[i]); for(var i=0;i<moviesData.length;i++) add(moviesData[i]); for(var i=0;i<scheduleData.length;i++) { var d = scheduleData[i]; if(d.animeList) { for(var j=0;j<d.animeList.length;j++) { var a = d.animeList[j]; add({ judul:a.anime_name, cover:a.cover, url:a.link, genre:[] }); } } } for(var i=0;i<customList.length;i++) { var c = customList[i]; if(c && c.url && !map.has(c.url)) map.set(c.url, { judul:c.judul, cover:c.cover, url:c.url, genre:c.genre || [] }); } animeListGrouped={}; for(var a of map.values()) { var fc = (a.judul[0]||'#').toUpperCase(); if(!/^[A-Z]$/.test(fc)) fc='#'; if(!animeListGrouped[fc]) animeListGrouped[fc]=[]; animeListGrouped[fc].push(a); } for(var k in animeListGrouped) animeListGrouped[k].sort(function(x,y){return x.judul.localeCompare(y.judul);}); allAnime = Array.from(map.values()); var browseStats = document.getElementById('browse-stats'); if(browseStats) browseStats.innerText = 'Total: '+allAnime.length; renderCurrentPage(); } catch(e){ console.error(e); showToast('Gagal memuat data','warning'); } finally { isLoadingComplete=true; } }

function renderLatest() { var allLatest = [...latestData]; var customList = getCustomAnime(); for(var i=0;i<customList.length;i++) allLatest.unshift({ judul: customList[i].judul, cover: customList[i].cover, url: customList[i].url, genre: customList[i].genre }); renderHorizontalCards(allLatest.slice(0,15), document.getElementById('latest-container')); }
function renderHomeSchedule() { if(scheduleData.length) { var today = scheduleData.find(function(d){return d.day===currentDay;})||scheduleData[0]; var items = today && today.animeList ? today.animeList.map(function(a){return { judul:a.anime_name, cover:a.cover, url:a.link };}) : []; renderHorizontalCards(items.slice(0,10), document.getElementById('home-schedule')); } else renderHorizontalCards(allAnime.slice(0,10), document.getElementById('home-schedule')); }
function renderSchedulePage() { if(!scheduleData.length) { document.getElementById('schedule-content').innerHTML='<div class="text-center text-gray-500">Jadwal tidak tersedia</div>'; return; } var tabs=''; for(var i=0;i<scheduleData.length;i++) { var d=scheduleData[i]; tabs+='<button onclick="selectDay(\''+d.day+'\')" class="px-4 py-2 rounded-full text-sm '+(d.day===currentDay?'bg-amber-500 text-white':'bg-surface text-gray-400')+'">'+d.day+'</button>'; } document.getElementById('day-tabs').innerHTML=tabs; renderScheduleByDay(currentDay); }
function renderScheduleByDay(day) { var data = scheduleData.find(function(d){return d.day===day;}); if(!data) return; var html='<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">'; for(var i=0;i<data.animeList.length;i++) { var a=data.animeList[i]; html+=renderGridCard({ judul:a.anime_name, cover:a.cover, url:a.link }); } html+='</div>'; document.getElementById('schedule-content').innerHTML=html; }
function renderMovies() { var start=(currentMoviesPage-1)*ITEMS_PER_PAGE; var items=moviesData.slice(start,start+ITEMS_PER_PAGE); var html=''; for(var i=0;i<items.length;i++) html+=renderGridCard(items[i]); document.getElementById('movies-container').innerHTML=html||'<div class="col-span-full text-center text-gray-500">Tidak ada movie</div>'; renderPaginationUI('movies-pagination', moviesData.length, currentMoviesPage, 'changeMoviesPage'); }
function renderBrowsePage() { var keys=Object.keys(animeListGrouped).sort(); var nav=''; for(var i=0;i<keys.length;i++) { var k=keys[i]; nav+='<button onclick="selectBrowseKey(\''+k+'\')" class="w-10 h-10 flex items-center justify-center rounded-xl '+(k===currentBrowseKey?'bg-amber-500 text-white':'bg-surface text-gray-400')+'">'+k+'</button>'; } document.getElementById('az-nav').innerHTML=nav; renderBrowseContent(currentBrowseKey); }
function renderBrowseContent(key) { var data=animeListGrouped[key]||[]; var start=(currentBrowsePage-1)*ITEMS_PER_PAGE; var items=data.slice(start,start+ITEMS_PER_PAGE); var html=''; for(var i=0;i<items.length;i++) html+=renderGridCard(items[i]); document.getElementById('browse-container').innerHTML=html||'<div class="col-span-full text-center text-gray-500">Tidak ada anime</div>'; renderPaginationUI('browse-pagination', data.length, currentBrowsePage, 'changeBrowsePage'); }
function renderGenres() { var set=new Set(); for(var i=0;i<latestData.length;i++) { var a=latestData[i]; if(a.genre) { for(var j=0;j<a.genre.length;j++) set.add(a.genre[j]); } } var customList = getCustomAnime(); for(var i=0;i<customList.length;i++) { if(customList[i].genre) { for(var j=0;j<customList[i].genre.length;j++) set.add(customList[i].genre[j]); } } var html=''; var sortedGenres = Array.from(set).sort(); for(var i=0;i<sortedGenres.length;i++) { var g=sortedGenres[i]; html+='<button onclick="filterByGenre(\''+g+'\')" class="px-4 py-2 bg-surface rounded-xl text-xs hover:bg-amber-500">'+g+'</button>'; } document.getElementById('genre-list').innerHTML=html||'<div class="text-gray-500">Memuat genre...</div>'; }
function filterByGenre(genre) { document.getElementById('genre-title').classList.remove('hidden'); document.getElementById('active-genre-name').innerText=genre; var res=latestData.filter(function(a){return a.genre && a.genre.includes(genre);}); var customList = getCustomAnime(); var customRes = customList.filter(function(a){return a.genre && a.genre.includes(genre);}); var allRes = [...res, ...customRes]; var html=''; for(var i=0;i<allRes.length;i++) html+=renderGridCard(allRes[i]); document.getElementById('genre-container').innerHTML=html||'<div class="col-span-full text-center text-gray-500">Tidak ada data</div>'; }
function renderPaginationUI(contId, total, cur, fn) { var totalPages=Math.ceil(total/ITEMS_PER_PAGE); var el=document.getElementById(contId); if(totalPages<=1||!el){if(el)el.innerHTML='';return;} var inputId=contId+'-jump'; el.innerHTML='<button onclick="'+fn+'('+(cur-1)+')" '+(cur===1?'disabled':'')+' class="px-4 py-2 rounded-xl bg-surface disabled:opacity-30"><i data-lucide="chevron-left" class="w-4 h-4"></i></button><div class="flex items-center gap-1"><input type="number" id="'+inputId+'" class="pagination-input" value="'+cur+'" min="1" max="'+totalPages+'"><span class="text-xs">/ '+totalPages+'</span><button class="pagination-go" onclick="var val=document.getElementById(\''+inputId+'\').value;'+fn+'(Math.min('+totalPages+',Math.max(1,parseInt(val||\'1\'))))"><i data-lucide="chevrons-left-right" class="w-4 h-4"></i></button></div><button onclick="'+fn+'('+(cur+1)+')" '+(cur===totalPages?'disabled':'')+' class="px-4 py-2 rounded-xl bg-surface disabled:opacity-30"><i data-lucide="chevron-right" class="w-4 h-4"></i></button>'; lucide.createIcons(); var inputEl = document.getElementById(inputId); if(inputEl) { inputEl.addEventListener('keypress',function(e){if(e.key==='Enter'){var v=e.target.value;window[fn](Math.min(totalPages,Math.max(1,parseInt(v||'1'))));}}); } }
function changeBrowsePage(p) { currentBrowsePage=p; renderBrowseContent(currentBrowseKey); window.scrollTo({top:0}); }
function changeMoviesPage(p) { currentMoviesPage=p; renderMovies(); window.scrollTo({top:0}); }
function selectDay(day) { currentDay=day; renderSchedulePage(); }
function selectBrowseKey(k) { currentBrowseKey=k; currentBrowsePage=1; renderBrowseContent(k); }

var searchInput = document.getElementById('search-input');
if(searchInput) { searchInput.addEventListener('input',function(e){ var q=e.target.value.toLowerCase().trim(); var res=allAnime.filter(function(a){return a.judul && a.judul.toLowerCase().includes(q);}); var html=''; for(var i=0;i<Math.min(50,res.length);i++) html+=renderGridCard(res[i]); document.getElementById('search-results').innerHTML=html||'<div class="col-span-full text-center text-gray-500">Tidak ditemukan</div>'; }); }

async function loadDetail(url) { if(!url||url==='#'){showToast('URL tidak valid','warning');return;} if(!canWatchEpisode(url)) { var cu = getCurrentUser(); if(cu && getCurrentPlan() === 'free') { showIklan(function(success) { if(success) loadDetail(url); }); } return; } openPlayer(); var content=document.getElementById('player-content'); content.innerHTML='<div class="flex justify-center py-20"><div class="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div></div>'; try { var customList = getCustomAnime(); var customAnime = null; for(var i=0;i<customList.length;i++) { if(customList[i].url === url) { customAnime = customList[i]; break; } } var result = null; var detail = null; if(customAnime) { detail = { judul: customAnime.judul, cover: customAnime.cover, sinopsis: 'Uploaded by owner', rating: 'Custom', chapter: customAnime.episode || [] }; } else { result = await fetchWithFallback('detail',{url:url}); detail=result.data?.[0]||result.data||result; } if(detail && detail.judul) { if(!useKey(url, detail.judul, detail.cover||'')) { closePlayer(); return; } var eps=detail.chapter||[]; var epHtml='<div class="grid grid-cols-4 sm:grid-cols-6 gap-2">'; for(var i=0;i<eps.length;i++) { var e=eps[i]; var epUrl = e.url || e.link || ''; epHtml+='<button class="bg-surface hover:bg-amber-500 py-2 rounded-xl text-xs" onclick="playEpisode(\''+epUrl.replace(/'/g,"\\'")+'\', \''+url+'\')">'+(e.ch||e.title||'Episode '+(i+1))+'</button>'; } epHtml+='</div>'; content.innerHTML='<div id="video-container" class="mb-4"><div class="aspect-video bg-dark flex items-center justify-center rounded-xl"><p class="text-gray-500">Pilih episode di bawah</p></div></div><div class="px-4"><div class="flex gap-4 mb-4"><img class="w-20 h-28 object-cover rounded-xl" src="'+(detail.cover||'')+'"><div><h2 class="font-bold">'+detail.judul+'</h2><span class="badge-pill bg-amber-500/20 text-amber-400">'+(detail.rating||'N/A')+'</span></div></div><div class="bg-white/5 p-3 rounded-xl mb-4"><div class="text-[10px] text-gray-500">Sinopsis</div><p class="text-xs line-clamp-3">'+(detail.sinopsis||'Tidak ada sinopsis')+'</p></div><div class="bg-white/5 p-3 rounded-xl"><div class="flex justify-between mb-2"><span class="font-bold text-sm">Episode</span><span class="text-[10px] text-amber-400">'+eps.length+' EP</span></div>'+epHtml+'</div></div>'; lucide.createIcons(); } else throw new Error(); } catch(e) { content.innerHTML='<div class="text-center text-red-400 py-20">Gagal memuat detail</div>'; } }
async function playEpisode(url, animeUrl) { var vc=document.getElementById('video-container'); if(!vc) return; if(url && (url.startsWith('blob:') || url.startsWith('data:'))) { vc.innerHTML='<video class="w-full aspect-video rounded-xl" controls autoplay><source src="'+url+'" type="video/mp4"></video>'; return; } vc.innerHTML='<div class="flex justify-center py-10"><div class="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div></div>'; try { var videoUrl=null; if(CURRENT_API==='primary') { var res=await fetchWithFallback('episode',{url:url,reso:'720p'}); var streams=res.data?.[0]?.stream||[]; var link=streams.find(function(s){return s.link && s.link.includes('.mp4');})||streams[0]; videoUrl=link && link.link; } if(videoUrl) { vc.innerHTML='<video class="w-full aspect-video rounded-xl" controls autoplay><source src="'+videoUrl+'" type="video/mp4"></video>'; } else if(url && url.startsWith('http')) { vc.innerHTML='<video class="w-full aspect-video rounded-xl" controls autoplay><source src="'+url+'" type="video/mp4"></video>'; } else { vc.innerHTML='<div class="bg-red-500/10 text-red-400 p-4 rounded-xl text-center">Video tidak tersedia</div>'; } } catch(e) { vc.innerHTML='<div class="bg-red-500/10 text-red-400 p-4 rounded-xl text-center">Gagal memuat video</div>'; } }

function openPlayer() { closeProfile(); closeSettings(); document.getElementById('player-sheet').classList.add('open'); document.getElementById('overlay').classList.add('opacity-100','visible'); document.body.style.overflow='hidden'; }
function closePlayer() { document.getElementById('player-sheet').classList.remove('open'); if(!document.getElementById('profile-sheet').classList.contains('open') && !document.getElementById('settings-sheet').classList.contains('open')) { document.getElementById('overlay').classList.remove('opacity-100','visible'); document.body.style.overflow=''; } }
function openProfile() { closePlayer(); closeSettings(); document.getElementById('profile-sheet').classList.add('open'); document.getElementById('overlay').classList.add('opacity-100','visible'); lucide.createIcons(); }
function closeProfile() { document.getElementById('profile-sheet').classList.remove('open'); if(!document.getElementById('player-sheet').classList.contains('open') && !document.getElementById('settings-sheet').classList.contains('open')) { document.getElementById('overlay').classList.remove('opacity-100','visible'); document.body.style.overflow=''; } }
function toggleSidebar() { var sb=document.getElementById('sidebar'); var ov=document.getElementById('overlay'); if(sb.classList.contains('translate-x-0')) { sb.classList.remove('translate-x-0'); sb.classList.add('-translate-x-full'); if(!document.getElementById('player-sheet').classList.contains('open') && !document.getElementById('profile-sheet').classList.contains('open') && !document.getElementById('settings-sheet').classList.contains('open')) ov.classList.remove('opacity-100','visible'); } else { closePlayer(); closeProfile(); closeSettings(); sb.classList.remove('-translate-x-full'); sb.classList.add('translate-x-0'); ov.classList.add('opacity-100','visible'); } }
function closeAllSheets() { closePlayer(); closeProfile(); closeSettings(); var sb=document.getElementById('sidebar'); if(sb.classList.contains('translate-x-0')) toggleSidebar(); if(notifPanelOpen) toggleNotificationPanel(); }
function scrollToTop() { window.scrollTo({top:0,behavior:'smooth'}); }
window.onscroll = function() { var btn = document.getElementById('scroll-top'); if(document.documentElement.scrollTop>300) { btn.classList.remove('opacity-0','invisible','translate-y-10'); btn.classList.add('opacity-100','visible','translate-y-0'); } else { btn.classList.add('opacity-0','invisible','translate-y-10'); btn.classList.remove('opacity-100','visible','translate-y-0'); } };

function renderCurrentPage() { 
    if(currentPage==='home') { renderLatest(); renderHomeSchedule(); renderHomeProfile(); renderViralAnime(); renderTopGlobalUsersCarousel(); setTimeout(function() { if(swiperInstance) swiperInstance.destroy(true, true); swiperInstance = new Swiper('.mySwiper', { slidesPerView: 1, spaceBetween: 20, pagination: { el: '.swiper-pagination', clickable: true }, loop: true, autoplay: { delay: 5000, disableOnInteraction: false } }); }, 100); }
    else if(currentPage==='schedule') renderSchedulePage(); 
    else if(currentPage==='movies') renderMovies(); 
    else if(currentPage==='browse' && isLoadingComplete) renderBrowsePage(); 
    else if(currentPage==='genres') renderGenres(); 
    else if(currentPage==='top') { renderTopUsersList(); renderTopAnimeList(); renderChatPreview(); }
    else if(currentPage==='premium') renderPremiumPage(); 
    else if(currentPage==='history') renderHistory(); 
    else if(currentPage==='report') renderUserReports(); 
    else if(currentPage==='account') renderAccountPage();
    else if(currentPage==='help') { lucide.createIcons(); }
    else if(currentPage==='ownerReports' && currentUserIsOwner()) renderAllReports(); 
    else if(currentPage==='ownerManage' && currentUserIsOwner()) renderRoleUsersList(); 
    else if(currentPage==='ownerKey' && currentUserIsOwner()) { var genreSelect = document.getElementById('upload-genre'); if(genreSelect) { var customList = getCustomAnime(); var genres = new Set(); for(var i=0;i<customList.length;i++) { if(customList[i].genre) { for(var j=0;j<customList[i].genre.length;j++) genres.add(customList[i].genre[j]); } } var html = '<option value="">Pilih genre yang sudah ada</option>'; for(var g of genres) html += '<option value="'+g+'">'+g+'</option>'; genreSelect.innerHTML = html; } }
}

function switchPage(page) { currentPage=page; var pages = document.querySelectorAll('.page'); for(var i=0;i<pages.length;i++) pages[i].classList.add('hidden'); var targetPage = document.getElementById('page-'+page); if(targetPage) targetPage.classList.remove('hidden'); var navBtns = document.querySelectorAll('.nav-btn'); for(var i=0;i<navBtns.length;i++) { var btn = navBtns[i]; if(btn.dataset.page===page) btn.classList.add('text-amber-500'); else btn.classList.remove('text-amber-500'); } var searchContainer = document.getElementById('search-container'); if(searchContainer) searchContainer.style.display = page==='search'?'block':'none'; renderCurrentPage(); window.scrollTo({top:0}); if(notifPanelOpen) toggleNotificationPanel(); }
function showToast(msg,type) { type = type || 'info'; var t=document.createElement('div'); t.className='fixed bottom-28 left-1/2 -translate-x-1/2 z-[2000] px-4 py-2 rounded-xl text-white text-xs font-semibold '+(type==='warning'?'bg-orange-500':'bg-amber-600'); t.innerText=msg; document.body.appendChild(t); setTimeout(function(){t.remove();},3000); }
async function initApp() { 
    lucide.createIcons(); 
    await loadAllData(); 
    switchPage('home'); 
    updateUserUI(); 
    loadChatMessages(); 
    setInterval(function(){ 
        if(currentPage==='home') { 
            renderLatest(); 
            renderHomeSchedule(); 
            renderViralAnime(); 
            renderTopGlobalUsersCarousel(); 
        } 
        if(currentPage==='top') { 
            renderTopUsersList(); 
            renderTopAnimeList(); 
            renderChatPreview(); 
        } 
    }, 60000); 
}

// ========== GLOBAL CHAT SYSTEM WITH PROFILE ==========
var chatMessages = [];

function loadChatMessages() {
    var saved = localStorage.getItem('ak_global_chat');
    if (saved) {
        chatMessages = JSON.parse(saved);
    } else {
        var cu = getCurrentUser();
        chatMessages = [
            {
                id: Date.now(),
                senderEmail: 'admin@mywibu.app',
                senderName: 'Kawaki',
                senderLevel: 9999,
                senderAvatar: null,
                senderUserId: '#123456',
                message: 'simpen aja kalo ragu...',
                timestamp: Date.now() - 3600000,
                read: false
            }
        ];
        saveChatMessages();
    }
    updateChatBadge();
    renderChatPreview();
}

function saveChatMessages() {
    localStorage.setItem('ak_global_chat', JSON.stringify(chatMessages));
    updateChatBadge();
    renderChatPreview();
}

function updateChatBadge() {
    var unread = chatMessages.filter(function(msg) { return !msg.read; }).length;
    var badge = document.getElementById('chatNotificationBadge');
    if (badge) {
        if (unread > 0) {
            badge.innerText = unread > 99 ? '99+' : unread;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

function renderChatPreview() {
    var container = document.getElementById('globalChatPreview');
    if (!container) return;
    
    var lastMessages = chatMessages.slice(-10).reverse();
    if (lastMessages.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 text-xs py-4">Belum ada chat. Jadi yang pertama!</div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < lastMessages.length; i++) {
        var msg = lastMessages[i];
        var isOwner = msg.senderEmail === 'admin@mywibu.app';
        var isAdmin = getUserRole(msg.senderEmail) === 'admin';
        var badge = getBadge(msg.senderLevel || 1);
        
        html += `
            <div class="glass rounded-xl p-3 cursor-pointer hover:bg-amber-500/10 transition" onclick="openGlobalChat()">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                    <div class="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center overflow-hidden text-[10px] font-bold text-white">
                        ${escapeHtml(msg.senderName ? msg.senderName.charAt(0).toUpperCase() : '?')}
                    </div>
                    <span class="text-xs font-semibold">${escapeHtml(msg.senderName || 'Anonymous')}</span>
                    ${isOwner || isAdmin ? '<i data-lucide="badge-check" class="w-3 h-3 text-amber-400"></i>' : ''}
                    <span class="text-[8px] text-gray-500 font-mono">${escapeHtml(msg.senderUserId || '#XXXXXX')}</span>
                    <span class="badge-pill bg-amber-500/20 text-amber-400 text-[8px]">${badge.label}</span>
                    <div class="text-[9px] text-gray-500 ml-auto">${new Date(msg.timestamp).toLocaleTimeString()}</div>
                </div>
                <div class="text-xs text-gray-300 pl-8">${escapeHtml(msg.message)}</div>
            </div>
        `;
    }
    container.innerHTML = html;
    lucide.createIcons();
}

function openGlobalChat() {
    for (var i = 0; i < chatMessages.length; i++) {
        chatMessages[i].read = true;
    }
    saveChatMessages();
    
    var cu = getCurrentUser();
    var isGuest = DB.get('guest_mode') === true;
    
    if (!cu && !isGuest) {
        showToast('Login dulu buat chat!', 'warning');
        return;
    }
    
    var modal = document.createElement('div');
    modal.id = 'globalChatModal';
    modal.className = 'fixed inset-0 z-[500] bg-black/90 flex items-center justify-center';
    modal.innerHTML = `
        <div class="glass rounded-2xl w-full max-w-md mx-4 h-[80vh] flex flex-col">
            <div class="flex justify-between items-center p-4 border-b border-amber-500/20">
                <h3 class="font-bold text-amber-400"><i data-lucide="message-circle" class="w-4 h-4 inline"></i> GLOBAL CHAT</h3>
                <button onclick="closeGlobalChat()" class="text-gray-400 hover:text-white"><i data-lucide="x" class="w-5 h-5"></i></button>
            </div>
            <div id="chatMessagesFull" class="flex-1 overflow-y-auto p-4 space-y-3"></div>
            <div class="p-4 border-t border-amber-500/20 flex gap-2">
                <div class="flex-1">
                    <input type="text" id="chatInput" class="input-field" placeholder="Ketik pesan..." onkeypress="if(event.key==='Enter') sendChatMessage()">
                </div>
                <button onclick="sendChatMessage()" class="bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 rounded-xl text-white text-sm font-semibold">Kirim</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    renderChatMessagesFull();
    lucide.createIcons();
}

function closeGlobalChat() {
    var modal = document.getElementById('globalChatModal');
    if (modal) modal.remove();
}

function renderChatMessagesFull() {
    var container = document.getElementById('chatMessagesFull');
    if (!container) return;
    
    if (chatMessages.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 text-sm py-10">Belum ada pesan. Jadi yang pertama chat!</div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < chatMessages.length; i++) {
        var msg = chatMessages[i];
        var isOwner = msg.senderEmail === 'admin@mywibu.app';
        var isAdmin = getUserRole(msg.senderEmail) === 'admin';
        var badge = getBadge(msg.senderLevel || 1);
        
        html += `
            <div class="glass rounded-xl p-3">
                <div class="flex items-center gap-2 mb-2 flex-wrap">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center overflow-hidden text-xs font-bold text-white">
                        ${escapeHtml(msg.senderName ? msg.senderName.charAt(0).toUpperCase() : '?')}
                    </div>
                    <span class="text-sm font-semibold">${escapeHtml(msg.senderName || 'Anonymous')}</span>
                    ${isOwner || isAdmin ? '<i data-lucide="badge-check" class="w-4 h-4 text-amber-400"></i>' : ''}
                    <span class="text-[9px] text-gray-500 font-mono">${escapeHtml(msg.senderUserId || '#XXXXXX')}</span>
                    <span class="badge-pill bg-amber-500/20 text-amber-400 text-[9px]">${badge.label}</span>
                    <div class="text-[9px] text-gray-500 ml-auto">${new Date(msg.timestamp).toLocaleString()}</div>
                </div>
                <div class="text-sm text-gray-200 pl-10">${escapeHtml(msg.message)}</div>
            </div>
        `;
    }
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
    lucide.createIcons();
}

function sendChatMessage() {
    var input = document.getElementById('chatInput');
    var message = input.value.trim();
    if (!message) return;
    
    var cu = getCurrentUser();
    var isGuest = DB.get('guest_mode') === true;
    
    var senderEmail = '';
    var senderName = '';
    var senderLevel = 1;
    var senderAvatar = null;
    var senderUserId = '#000000';
    
    if (cu) {
        senderEmail = cu.email;
        senderName = cu.username || cu.email.split('@')[0];
        senderLevel = cu.level || 1;
        senderAvatar = cu.avatar;
        senderUserId = cu.userId || '#000000';
    } else if (isGuest) {
        senderEmail = 'guest_' + Date.now();
        senderName = 'Guest Mode';
        senderLevel = 1;
        senderUserId = '#GUEST';
    } else {
        showToast('Login dulu buat chat!', 'warning');
        return;
    }
    
    var newMsg = {
        id: Date.now(),
        senderEmail: senderEmail,
        senderName: senderName,
        senderLevel: senderLevel,
        senderAvatar: senderAvatar,
        senderUserId: senderUserId,
        message: message,
        timestamp: Date.now(),
        read: false
    };
    
    chatMessages.push(newMsg);
    saveChatMessages();
    
    input.value = '';
    renderChatMessagesFull();
    renderChatPreview();
    updateChatBadge();
    
    // SYNC KE SERVER
    syncChatToServer(newMsg);
    
    showToast('Pesan terkirim!', 'info');
}

async function syncChatToServer(msg) {
    await apiCall('sendChat', { message: msg });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Global window functions
window.switchPage=switchPage; window.loadDetail=loadDetail; window.playEpisode=playEpisode; window.closePlayer=closePlayer; window.closeProfile=closeProfile; window.openProfile=openProfile; window.toggleSidebar=toggleSidebar; window.selectDay=selectDay; window.selectBrowseKey=selectBrowseKey; window.changeBrowsePage=changeBrowsePage; window.changeMoviesPage=changeMoviesPage; window.filterByGenre=filterByGenre; window.scrollToTop=scrollToTop; window.openSettings=openSettings; window.closeSettings=closeSettings; window.doLogout=doLogout; window.guestLogin=guestLogin; window.guestLogout=guestLogout; window.googleLogin=googleLogin; window.doLogin=doLogin; window.doRegister=doRegister; window.showLogin=showLogin; window.showRegister=showRegister; window.upgradeToPremium=upgradeToPremium; window.submitReportWithImage=submitReportWithImage; window.sendBroadcastWithMedia=sendBroadcastWithMedia; window.assignRoleWithExpired=assignRoleWithExpired; window.updateReportStatus=updateReportStatus; window.toggleNotificationPanel=toggleNotificationPanel; window.markNotificationRead=markNotificationRead; window.markAllNotificationsRead=markAllNotificationsRead; window.triggerAvatarUpload=triggerAvatarUpload; window.handleAvatarChange=handleAvatarChange; window.saveSettings=saveSettings; window.toggleCustomExpired=toggleCustomExpired; window.switchAccountTab=switchAccountTab; window.skipIklan=skipIklan; window.addUserKey=addUserKey; window.addUserLevel=addUserLevel; window.addUserGem=addUserGem; window.toggleFaq=toggleFaq; window.uploadAnimeWithEpisodes=uploadAnimeWithEpisodes;
window.closeCommunityModal=closeCommunityModal;
window.openGlobalChat = openGlobalChat;
window.closeGlobalChat = closeGlobalChat;
window.sendChatMessage = sendChatMessage;

ensureOwnerAccount(); 
var cu = getCurrentUser(); 
var isGuest = DB.get('guest_mode')===true; 
if(cu || isGuest) { 
    if(!cu && isGuest) { 
        document.getElementById('login-page').style.display = 'none'; 
        initApp(); 
        updateUserUIGuestMode(); 
        showToast('Mode Tamu aktif - Maks 2 episode/anime, 480p','warning'); 
    } 
    else if(cu) { 
        document.getElementById('login-page').style.display = 'none'; 
        initApp(); 
    } 
} else { 
    document.getElementById('login-page').style.display = 'flex'; 
}

document.getElementById('closeModalBtn')?.addEventListener('click', closeCommunityModal);

// ========== FORCE FIX TOMBOL LOGIN ==========
(function forceFixLoginButtons() {
    setTimeout(function() {
        var loginPage = document.getElementById('login-page');
        if (loginPage) {
            loginPage.style.pointerEvents = 'auto';
            loginPage.style.zIndex = '999999';
            loginPage.style.position = 'fixed';
            loginPage.style.inset = '0';
            loginPage.style.display = 'flex';
        }
        
        var semuaTombol = document.querySelectorAll('#login-page button, #login-form button, #register-form button, .btn-primary, .btn-google, button[onclick*="doLogin"], button[onclick*="doRegister"], button[onclick*="showLogin"], button[onclick*="showRegister"], button[onclick*="guestLogin"]');
        
        for (var i = 0; i < semuaTombol.length; i++) {
            var btn = semuaTombol[i];
            btn.style.pointerEvents = 'auto';
            btn.style.cursor = 'pointer';
            btn.style.zIndex = '999999';
            btn.style.position = 'relative';
            btn.style.opacity = '1';
            btn.style.visibility = 'visible';
            btn.disabled = false;
            btn.removeAttribute('disabled');
        }
        
        var loginForm = document.getElementById('login-form');
        var registerForm = document.getElementById('register-form');
        if (loginForm) loginForm.style.pointerEvents = 'auto';
        if (registerForm) registerForm.style.pointerEvents = 'auto';
        
        console.log('🔧 TOMBOL LOGIN/DAFTAR SUDAH BISA DI KLIK');
    }, 100);
})();

// ========== POLLING REALTIME ==========
setInterval(async () => {
    if(window.currentPage === 'home' || window.currentPage === 'top'){
        await renderTopGlobalUsersCarousel();
        await renderTopUsersList();
        await renderTopAnimeList();
    }
    await loadChatMessages();
}, 5000);

setTimeout(() => { loadChatMessages(); }, 1000);
console.log('🔥 REALTIME ACTIVE - SEMUA FITUR JALAN, TOP GLOBAL BISA DILIHAT SEMUA USER');