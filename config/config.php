<?php
// Configuration de la base de données
$config = [
    'db' => [
        'host' => 'localhost',
        'username' => 'root',
        'password' => '',
        'dbname' => 'billet'
    ],
    'app' => [
        'name' => 'Gestion de Billets d\'Avion',
        'version' => '1.0.0'
    ]
];

// Fonction pour vérifier et créer la base de données si elle n'existe pas
function checkAndCreateDatabase() {
    global $config;
    
    try {
        // Connexion sans sélectionner de base de données
        $conn = new mysqli($config['db']['host'], $config['db']['username'], $config['db']['password']);
        
        if ($conn->connect_error) {
            throw new Exception("Erreur de connexion: " . $conn->connect_error);
        }
        
        // Vérifier si la base de données existe
        $result = $conn->query("SHOW DATABASES LIKE '{$config['db']['dbname']}'");
        
        if ($result->num_rows == 0) {
            // La base de données n'existe pas, on la crée
            $sql = "CREATE DATABASE {$config['db']['dbname']}";
            if ($conn->query($sql) === TRUE) {
                echo "<div class='alert alert-success'>Base de données créée avec succès</div>";
                
                // Sélectionner la base de données nouvellement créée
                $conn->select_db($config['db']['dbname']);
                
                // Créer les tables nécessaires
                createTables($conn);
            } else {
                throw new Exception("Erreur lors de la création de la base de données: " . $conn->error);
            }
        }
        
        $conn->close();
        return true;
    } catch (Exception $e) {
        echo "<div class='alert alert-danger'>Erreur: " . $e->getMessage() . "</div>";
        return false;
    }
}

// Fonction pour créer les tables
function createTables($conn) {
    // Table clients
    $sql_clients = "CREATE TABLE clients (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        tel VARCHAR(20) NOT NULL,
        supprime TINYINT(1) DEFAULT 0,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";
    
    // Table vols
    $sql_vols = "CREATE TABLE vols (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        compagnie VARCHAR(100) NOT NULL,
        origine VARCHAR(100) NOT NULL,
        destination VARCHAR(100) NOT NULL,
        prix DECIMAL(10,2) NOT NULL,
        supprime TINYINT(1) DEFAULT 0,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";
    
    // Table réservations
    $sql_reservations = "CREATE TABLE reservations (
        id INT(11) AUTO_INCREMENT PRIMARY KEY,
        client_id INT(11) NOT NULL,
        vol_id INT(11) NOT NULL,
        date_r VARCHAR(50) NOT NULL,
        supprime TINYINT(1) DEFAULT 0,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (vol_id) REFERENCES vols(id)
    )";
    
    $conn->query($sql_clients);
    $conn->query($sql_vols);
    $conn->query($sql_reservations);
}

// Fonction pour établir une connexion sécurisée à la base de données
function getDbConnection() {
    global $config;
    
    try {
        $conn = new mysqli(
            $config['db']['host'], 
            $config['db']['username'], 
            $config['db']['password'], 
            $config['db']['dbname']
        );
        
        if ($conn->connect_error) {
            throw new Exception("Erreur de connexion: " . $conn->connect_error);
        }
        
        // Définir le jeu de caractères à utf8
        $conn->set_charset("utf8");
        
        return $conn;
    } catch (Exception $e) {
        echo "<div class='alert alert-danger'>Erreur: " . $e->getMessage() . "</div>";
        exit;
    }
}

// Fonction pour échapper les entrées utilisateur
function sanitize($conn, $input) {
    if (is_array($input)) {
        $sanitized = [];
        foreach ($input as $key => $value) {
            $sanitized[$key] = sanitize($conn, $value);
        }
        return $sanitized;
    }
    
    return $conn->real_escape_string(trim($input));
}

// Fonction pour valider les entrées
function validate($data, $rules) {
    $errors = [];
    
    foreach ($rules as $field => $rule) {
        // Vérifier si le champ existe
        if (!isset($data[$field])) {
            $errors[$field] = "Le champ est requis";
            continue;
        }
        
        $value = $data[$field];
        
        // Validation selon le type
        if (strpos($rule, 'required') !== false && empty($value)) {
            $errors[$field] = "Le champ est requis";
        }
        
        if (strpos($rule, 'numeric') !== false && !is_numeric($value)) {
            $errors[$field] = "Le champ doit être numérique";
        }
        
        if (strpos($rule, 'tel') !== false && !preg_match('/^[0-9]{10,15}$/', $value)) {
            $errors[$field] = "Numéro de téléphone invalide";
        }
    }
    
    return $errors;
}

// Vérifier et créer la base de données au démarrage
checkAndCreateDatabase();
?>
