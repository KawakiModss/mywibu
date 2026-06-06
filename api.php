<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$dbFile = 'db.json';
if (!file_exists($dbFile)) {
    $defaultData = [
        'users' => [
            'admin@mywibu.app' => [
                'username' => 'Kawaki',
                'password' => 'KAWAICHAN9',
                'level' => 9999,
                'xp' => 999900,
                'keys' => 9999,
                'wibuGem' => 9999,
                'avatar' => null,
                'userId' => '#123456',
                'joinDate' => time() * 1000
            ]
        ],
        'premium_status' => [],
        'user_roles' => [],
        'reports' => [],
        'watch_history' => [],
        'watch_data' => [],
        'notifications' => [],
        'custom_anime' => [],
        'iklan_limit' => [],
        'chat_messages' => [
            [
                'id' => time() * 1000,
                'senderEmail' => 'admin@mywibu.app',
                'senderName' => 'Kawaki',
                'senderLevel' => 9999,
                'senderUserId' => '#123456',
                'message' => 'simpen aja kalo ragu...',
                'timestamp' => (time() - 3600) * 1000,
                'read' => false
            ]
        ]
    ];
    file_put_contents($dbFile, json_encode($defaultData, JSON_PRETTY_PRINT));
}

$data = json_decode(file_get_contents($dbFile), true);
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// ========== USER MANAGEMENT ==========
if ($action === 'getAllUsers') {
    $safeUsers = [];
    foreach ($data['users'] as $email => $user) {
        $safeUsers[$email] = $user;
        unset($safeUsers[$email]['password']);
    }
    echo json_encode(['status' => 'ok', 'users' => $safeUsers]);
}
elseif ($action === 'syncUsers') {
    $input = json_decode(file_get_contents('php://input'), true);
    $data['users'] = $input['users'];
    file_put_contents($dbFile, json_encode($data, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'ok']);
}
elseif ($action === 'register') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'];
    $username = $input['username'];
    $password = $input['password'];
    
    if (isset($data['users'][$email])) {
        echo json_encode(['status' => 'error', 'message' => 'Email already exists']);
        exit();
    }
    
    $data['users'][$email] = [
        'username' => $username,
        'password' => $password,
        'level' => 1,
        'xp' => 0,
        'keys' => 0,
        'wibuGem' => 0,
        'avatar' => null,
        'userId' => '#' . rand(100000, 999999),
        'joinDate' => time() * 1000
    ];
    
    file_put_contents($dbFile, json_encode($data, JSON_PRETTY_PRINT));
    $user = $data['users'][$email];
    unset($user['password']);
    echo json_encode(['status' => 'ok', 'user' => $user, 'email' => $email]);
}
elseif ($action === 'login') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'];
    $password = $input['password'];
    
    if (!isset($data['users'][$email]) || $data['users'][$email]['password'] !== $password) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid credentials']);
        exit();
    }
    
    $user = $data['users'][$email];
    unset($user['password']);
    echo json_encode(['status' => 'ok', 'user' => $user, 'email' => $email]);
}
elseif ($action === 'updateUserStats') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'];
    $stats = $input['stats'];
    
    if (isset($data['users'][$email])) {
        if (isset($stats['level'])) $data['users'][$email]['level'] = $stats['level'];
        if (isset($stats['xp'])) $data['users'][$email]['xp'] = $stats['xp'];
        if (isset($stats['keys'])) $data['users'][$email]['keys'] = $stats['keys'];
        if (isset($stats['wibuGem'])) $data['users'][$email]['wibuGem'] = $stats['wibuGem'];
        file_put_contents($dbFile, json_encode($data, JSON_PRETTY_PRINT));
    }
    echo json_encode(['status' => 'ok']);
}
elseif ($action === 'updateProfile') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'];
    $profile = $input['profile'];
    
    if (isset($data['users'][$email])) {
        if (isset($profile['username'])) $data['users'][$email]['username'] = $profile['username'];
        if (isset($profile['avatar'])) $data['users'][$email]['avatar'] = $profile['avatar'];
        file_put_contents($dbFile, json_encode($data, JSON_PRETTY_PRINT));
    }
    echo json_encode(['status' => 'ok']);
}

// ========== PREMIUM & ROLES ==========
elseif ($action === 'getPremiumStatus') {
    $email = $_GET['email'] ?? '';
    $status = $data['premium_status'][$email] ?? ['plan' => 'free', 'expiry' => null];
    echo json_encode(['status' => 'ok', 'premium' => $status]);
}
elseif ($action === 'setPremiumStatus') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'];
    $plan = $input['plan'];
    $expiry = $input['expiry'] ?? null;
    
    $data['premium_status'][$email] = ['plan' => $plan, 'expiry' => $expiry];
    file_put_contents($dbFile, json_encode($data, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'ok']);
}
elseif ($action === 'getUserRole') {
    $email = $_GET['email'] ?? '';
    $role = $data['user_roles'][$email] ?? 'user';
    echo json_encode(['status' => 'ok', 'role' => $role]);
}
elseif ($action === 'setUserRole') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'];
    $role = $input['role'];
    
    $data['user_roles'][$email] = $role;
    file_put_contents($dbFile, json_encode($data, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'ok']);
}

// ========== WATCH DATA & HISTORY (REALTIME) ==========
elseif ($action === 'updateWatchData') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'];
    $watchData = $input['watchData'];
    
    $data['watch_data'][$email] = $watchData;
    file_put_contents($dbFile, json_encode($data, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'ok']);
}
elseif ($action === 'getAllWatchData') {
    $allWatchData = [];
    foreach ($data['watch_data'] as $email => $wd) {
        foreach ($wd as $url => $info) {
            if (!isset($allWatchData[$url])) {
                $allWatchData[$url] = ['title' => $info['title'], 'cover' => $info['cover'], 'count' => 0];
            }
            $allWatchData[$url]['count'] += $info['count'];
        }
    }
    echo json_encode(['status' => 'ok', 'data' => $allWatchData]);
}
elseif ($action === 'syncHistory') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'];
    $history = $input['history'];
    
    $data['watch_history'][$email] = $history;
    file_put_contents($dbFile, json_encode($data, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'ok']);
}
elseif ($action === 'getHistory') {
    $email = $_GET['email'] ?? '';
    $history = $data['watch_history'][$email] ?? [];
    echo json_encode(['status' => 'ok', 'history' => $history]);
}

// ========== GLOBAL CHAT (REALTIME) ==========
elseif ($action === 'getChat') {
    $chat = $data['chat_messages'] ?? [];
    echo json_encode(['status' => 'ok', 'messages' => $chat]);
}
elseif ($action === 'sendChat') {
    $input = json_decode(file_get_contents('php://input'), true);
    $newMsg = $input['message'];
    
    if (!isset($data['chat_messages'])) $data['chat_messages'] = [];
    array_push($data['chat_messages'], $newMsg);
    if (count($data['chat_messages']) > 100) array_shift($data['chat_messages']);
    
    file_put_contents($dbFile, json_encode($data, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'ok']);
}

// ========== NOTIFICATIONS (BROADCAST REALTIME) ==========
elseif ($action === 'broadcast') {
    $input = json_decode(file_get_contents('php://input'), true);
    $broadcast = $input['broadcast'];
    $broadcast['id'] = time() . rand(1000, 9999);
    $broadcast['timestamp'] = time() * 1000;
    $broadcast['read'] = false;
    
    foreach ($data['users'] as $email => $user) {
        if (!isset($data['notifications'][$email])) $data['notifications'][$email] = [];
        array_unshift($data['notifications'][$email], $broadcast);
        if (count($data['notifications'][$email]) > 50) array_pop($data['notifications'][$email]);
    }
    
    file_put_contents($dbFile, json_encode($data, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'ok']);
}
elseif ($action === 'getNotifications') {
    $email = $_GET['email'] ?? '';
    $notifs = $data['notifications'][$email] ?? [];
    echo json_encode(['status' => 'ok', 'notifications' => $notifs]);
}
elseif ($action === 'markNotificationRead') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'];
    $notifId = $input['notificationId'];
    
    if (isset($data['notifications'][$email])) {
        foreach ($data['notifications'][$email] as &$notif) {
            if ($notif['id'] == $notifId) $notif['read'] = true;
        }
        file_put_contents($dbFile, json_encode($data, JSON_PRETTY_PRINT));
    }
    echo json_encode(['status' => 'ok']);
}

// ========== IKLAN LIMIT (REALTIME) ==========
elseif ($action === 'getIklanLimit') {
    $email = $_GET['email'] ?? '';
    $today = date('Y-m-d');
    $limit = $data['iklan_limit'][$email][$today] ?? 0;
    echo json_encode(['status' => 'ok', 'count' => $limit]);
}
elseif ($action === 'incrementIklan') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'];
    $today = date('Y-m-d');
    
    if (!isset($data['iklan_limit'][$email])) $data['iklan_limit'][$email] = [];
    $data['iklan_limit'][$email][$today] = ($data['iklan_limit'][$email][$today] ?? 0) + 1;
    
    file_put_contents($dbFile, json_encode($data, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'ok', 'count' => $data['iklan_limit'][$email][$today]]);
}

// ========== OWNER KEY MANAGEMENT ==========
elseif ($action === 'addUserKey') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'];
    $amount = $input['amount'];
    
    if (isset($data['users'][$email])) {
        $data['users'][$email]['keys'] = ($data['users'][$email]['keys'] ?? 0) + $amount;
        file_put_contents($dbFile, json_encode($data, JSON_PRETTY_PRINT));
    }
    echo json_encode(['status' => 'ok']);
}
elseif ($action === 'addUserLevel') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'];
    $amount = $input['amount'];
    
    if (isset($data['users'][$email])) {
        $data['users'][$email]['level'] = ($data['users'][$email]['level'] ?? 1) + $amount;
        $data['users'][$email]['xp'] = $data['users'][$email]['level'] * 100;
        file_put_contents($dbFile, json_encode($data, JSON_PRETTY_PRINT));
    }
    echo json_encode(['status' => 'ok']);
}
elseif ($action === 'addUserGem') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'];
    $amount = $input['amount'];
    
    if (isset($data['users'][$email])) {
        $data['users'][$email]['wibuGem'] = ($data['users'][$email]['wibuGem'] ?? 0) + $amount;
        file_put_contents($dbFile, json_encode($data, JSON_PRETTY_PRINT));
    }
    echo json_encode(['status' => 'ok']);
}

// ========== REPORTS ==========
elseif ($action === 'submitReport') {
    $input = json_decode(file_get_contents('php://input'), true);
    $report = $input['report'];
    $report['id'] = time() . rand(1000, 9999);
    $report['date'] = date('c');
    $report['status'] = 'pending';
    
    array_unshift($data['reports'], $report);
    file_put_contents($dbFile, json_encode($data, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'ok']);
}
elseif ($action === 'getReports') {
    echo json_encode(['status' => 'ok', 'reports' => $data['reports']]);
}

// ========== CUSTOM ANIME ==========
elseif ($action === 'getCustomAnime') {
    echo json_encode(['status' => 'ok', 'anime' => $data['custom_anime'] ?? []]);
}
elseif ($action === 'addCustomAnime') {
    $input = json_decode(file_get_contents('php://input'), true);
    $anime = $input['anime'];
    $anime['id'] = time();
    
    if (!isset($data['custom_anime'])) $data['custom_anime'] = [];
    array_push($data['custom_anime'], $anime);
    file_put_contents($dbFile, json_encode($data, JSON_PRETTY_PRINT));
    echo json_encode(['status' => 'ok', 'anime' => $anime]);
}
else {
    echo json_encode(['status' => 'error', 'message' => 'Unknown action: ' . $action]);
}
?>