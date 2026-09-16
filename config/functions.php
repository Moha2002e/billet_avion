<?php
require_once 'config.php';

/**
 * Exécute une requête préparée en toute sécurité
 * 
 * @param string $sql La requête SQL avec des placeholders
 * @param array $params Les paramètres à lier à la requête
 * @param string $types Les types de paramètres (i: integer, s: string, d: double, b: blob)
 * @return mysqli_stmt|false L'objet statement ou false en cas d'erreur
 */
function executeQuery($sql, $params = [], $types = '') {
    static $conn = null;
    
    if ($conn === null) {
        $conn = getDbConnection();
    }
    
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        error_log("Erreur de préparation de la requête: " . $conn->error);
        return false;
    }
    
    if (!empty($params)) {
        // Si les types ne sont pas spécifiés, on les déduit automatiquement
        if (empty($types)) {
            $types = '';
            foreach ($params as $param) {
                if (is_int($param)) {
                    $types .= 'i';
                } elseif (is_float($param)) {
                    $types .= 'd';
                } elseif (is_string($param)) {
                    $types .= 's';
                } else {
                    $types .= 'b';
                }
            }
        }
        
        // Bind des paramètres
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    
    return $stmt;
}

/**
 * Récupère tous les résultats d'une requête
 * 
 * @param string $sql La requête SQL avec des placeholders
 * @param array $params Les paramètres à lier à la requête
 * @param string $types Les types de paramètres
 * @return array Les résultats de la requête
 */
function fetchAll($sql, $params = [], $types = '') {
    $stmt = executeQuery($sql, $params, $types);
    
    if (!$stmt) {
        return [];
    }
    
    $result = $stmt->get_result();
    $data = [];
    
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
    
    $stmt->close();
    
    return $data;
}

/**
 * Récupère une seule ligne de résultat
 * 
 * @param string $sql La requête SQL avec des placeholders
 * @param array $params Les paramètres à lier à la requête
 * @param string $types Les types de paramètres
 * @return array|null La ligne de résultat ou null si aucun résultat
 */
function fetchOne($sql, $params = [], $types = '') {
    $stmt = executeQuery($sql, $params, $types);
    
    if (!$stmt) {
        return null;
    }
    
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    
    $stmt->close();
    
    return $row;
}

/**
 * Insère des données dans une table
 * 
 * @param string $table Le nom de la table
 * @param array $data Les données à insérer (clé => valeur)
 * @return int|false L'ID de la dernière insertion ou false en cas d'erreur
 */
function insert($table, $data) {
    $conn = getDbConnection();
    
    $columns = implode(', ', array_keys($data));
    $placeholders = implode(', ', array_fill(0, count($data), '?'));
    
    $sql = "INSERT INTO $table ($columns) VALUES ($placeholders)";
    
    $stmt = executeQuery($sql, array_values($data));
    
    if (!$stmt) {
        return false;
    }
    
    $insertId = $conn->insert_id;
    $stmt->close();
    
    return $insertId;
}

/**
 * Met à jour des données dans une table
 * 
 * @param string $table Le nom de la table
 * @param array $data Les données à mettre à jour (clé => valeur)
 * @param string $condition La condition WHERE (avec placeholders)
 * @param array $conditionParams Les paramètres pour la condition
 * @return bool True si succès, false sinon
 */
function update($table, $data, $condition, $conditionParams = []) {
    $set = [];
    
    foreach (array_keys($data) as $column) {
        $set[] = "$column = ?";
    }
    
    $setClause = implode(', ', $set);
    
    $sql = "UPDATE $table SET $setClause WHERE $condition";
    
    $params = array_merge(array_values($data), $conditionParams);
    
    $stmt = executeQuery($sql, $params);
    
    if (!$stmt) {
        return false;
    }
    
    $success = ($stmt->affected_rows > 0);
    $stmt->close();
    
    return $success;
}

/**
 * Suppression logique (mise à jour du champ 'supprime')
 * 
 * @param string $table Le nom de la table
 * @param int $id L'ID de l'enregistrement à supprimer
 * @return bool True si succès, false sinon
 */
function softDelete($table, $id) {
    return update($table, ['supprime' => 1], 'id = ?', [$id]);
}

/**
 * Affiche un message de succès
 * 
 * @param string $message Le message à afficher
 * @return void
 */
function showSuccess($message) {
    echo "<div class='alert alert-success'>$message</div>";
}

/**
 * Affiche un message d'erreur
 * 
 * @param string $message Le message à afficher
 * @return void
 */
function showError($message) {
    echo "<div class='alert alert-danger'>$message</div>";
}

/**
 * Redirection vers une autre page
 * 
 * @param string $url L'URL de destination
 * @return void
 */
function redirect($url) {
    header("Location: $url");
    exit;
}

/**
 * Génère un token CSRF
 * 
 * @return string Le token généré
 */
function generateCsrfToken() {
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    
    return $_SESSION['csrf_token'];
}

/**
 * Vérifie si le token CSRF est valide
 * 
 * @param string $token Le token à vérifier
 * @return bool True si valide, false sinon
 */
function validateCsrfToken($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}
?>
