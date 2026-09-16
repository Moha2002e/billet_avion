<?php
session_start();
require_once 'config/config.php';
require_once 'config/functions.php';

$info = "";

// Initialisation de la connexion
$conn = getDbConnection();

// Ajout d'un client
if (isset($_POST['ajouter_client'])) {
    // Vérification du token CSRF
    if (!isset($_POST['csrf_token']) || !validateCsrfToken($_POST['csrf_token'])) {
        showError("Erreur de sécurité. Veuillez réessayer.");
    } else {
        // Validation des données
        $rules = [
            'nom' => 'required',
            'prenom' => 'required',
            'tel' => 'required|tel'
        ];
        
        $errors = validate($_POST, $rules);
        
        if (empty($errors)) {
            // Préparation des données
            $data = [
                'nom' => sanitize($conn, $_POST['nom']),
                'prenom' => sanitize($conn, $_POST['prenom']),
                'tel' => sanitize($conn, $_POST['tel'])
            ];
            
            // Insertion sécurisée
            $sql = "INSERT INTO clients (nom, prenom, tel) VALUES (?, ?, ?)";
            $stmt = executeQuery($sql, array_values($data));
            
            if ($stmt) {
                $info = showSuccess("Client ajouté avec succès");
                $stmt->close();
            } else {
                $info = showError("Erreur lors de l'ajout du client");
            }
        } else {
            // Affichage des erreurs de validation
            foreach ($errors as $error) {
                $info .= showError($error);
            }
        }
    }
}

// Ajout d'un vol
if (isset($_POST['ajouter_vol'])) {
    // Vérification du token CSRF
    if (!isset($_POST['csrf_token']) || !validateCsrfToken($_POST['csrf_token'])) {
        showError("Erreur de sécurité. Veuillez réessayer.");
    } else {
        // Validation des données
        $rules = [
            'compagnie' => 'required',
            'origine' => 'required',
            'destination' => 'required',
            'prix' => 'required|numeric'
        ];
        
        $errors = validate($_POST, $rules);
        
        if (empty($errors)) {
            // Préparation des données
            $data = [
                'compagnie' => sanitize($conn, $_POST['compagnie']),
                'origine' => sanitize($conn, $_POST['origine']),
                'destination' => sanitize($conn, $_POST['destination']),
                'prix' => sanitize($conn, $_POST['prix'])
            ];
            
            // Insertion sécurisée
            $sql = "INSERT INTO vols (compagnie, origine, destination, prix) VALUES (?, ?, ?, ?)";
            $stmt = executeQuery($sql, array_values($data));
            
            if ($stmt) {
                $info = showSuccess("Vol ajouté avec succès");
                $stmt->close();
            } else {
                $info = showError("Erreur lors de l'ajout du vol");
            }
        } else {
            // Affichage des erreurs de validation
            foreach ($errors as $error) {
                $info .= showError($error);
            }
        }
    }
}

// Ajout d'une réservation
if (isset($_POST['ajouter_reservation'])) {
    // Vérification du token CSRF
    if (!isset($_POST['csrf_token']) || !validateCsrfToken($_POST['csrf_token'])) {
        showError("Erreur de sécurité. Veuillez réessayer.");
    } else {
        // Validation des données
        $rules = [
            'client_id' => 'required|numeric',
            'vol_id' => 'required|numeric'
        ];
        
        $errors = validate($_POST, $rules);
        
        if (empty($errors)) {
            // Préparation des données
            $data = [
                'client_id' => sanitize($conn, $_POST['client_id']),
                'vol_id' => sanitize($conn, $_POST['vol_id']),
                'date_r' => date("d/m/y H:i")
            ];
            
            // Insertion sécurisée
            $sql = "INSERT INTO reservations (client_id, vol_id, date_r) VALUES (?, ?, ?)";
            $stmt = executeQuery($sql, array_values($data));
            
            if ($stmt) {
                $info = showSuccess("Réservation ajoutée avec succès");
                $stmt->close();
            } else {
                $info = showError("Erreur lors de l'ajout de la réservation");
            }
        } else {
            // Affichage des erreurs de validation
            foreach ($errors as $error) {
                $info .= showError($error);
            }
        }
    }
}
?>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestion des clients et des vols</title>
    <link rel="stylesheet" href="style.css">
</head>

<body>
<h1>Gestion des clients et des vols</h1>
<header>
    <?php include "inc/nav.php"?>
</header>
<div class="container">

    <form action="index.php" method="post">
        <input type="hidden" name="csrf_token" value="<?php echo generateCsrfToken(); ?>">
        
        <label for="nom">Nom :</label>
        <input type="text" id="nom" name="nom" required>

        <label for="prenom">Prénom :</label>
        <input type="text" id="prenom" name="prenom" required>

        <label for="tel">Téléphone :</label>
        <input type="tel" id="tel" name="tel" required>

        <button type="submit" name="ajouter_client">Ajouter Client</button>
    </form>

    <form action="index.php" method="post">
        <input type="hidden" name="csrf_token" value="<?php echo generateCsrfToken(); ?>">
        
        <label for="compagnie">Compagnie :</label>
        <input type="text" id="compagnie" name="compagnie" required>

        <label for="origine">Origine :</label>
        <input type="text" id="origine" name="origine" required>

        <label for="destination">Destination :</label>
        <input type="text" id="destination" name="destination" required>

        <label for="prix">Prix :</label>
        <input type="text" id="prix" name="prix" required>

        <button type="submit" name="ajouter_vol">Ajouter Vol</button>
    </form>
    
    <form action="index.php" method="post">
        <input type="hidden" name="csrf_token" value="<?php echo generateCsrfToken(); ?>">
        
        <label for="client_id">Client :</label>
        <select id="client_id" name="client_id" required>
            <?php
            $clients = fetchAll("SELECT id, nom, prenom FROM clients WHERE supprime = 0");
            
            foreach ($clients as $client) {
                echo "<option value='".$client["id"]."'>".$client["nom"]." ".$client["prenom"]."</option>";
            }
            ?>
        </select>

        <label for="vol_id">Vol :</label>
        <select id="vol_id" name="vol_id" required>
            <?php
            $vols = fetchAll("SELECT id, compagnie, origine, destination FROM vols WHERE supprime = 0");
            
            foreach ($vols as $vol) {
                echo "<option value='".$vol["id"]."'>".$vol["compagnie"].": ".$vol["origine"]." - ".$vol["destination"]."</option>";
            }
            ?>
        </select>

        <button type="submit" name="ajouter_reservation">Ajouter Réservation</button>
    </form>
    
    <?php echo $info ?>

</div>
</body>
</html>
