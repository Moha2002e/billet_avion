<?php
session_start();
require_once 'config/config.php';
require_once 'config/functions.php';

// Initialisation de la connexion
$conn = getDbConnection();
$message = "";

// Traitement de la suppression via URL (pour les liens directs)
if (isset($_GET['type']) && isset($_GET['id'])) {
    $type = sanitize($conn, $_GET['type']);
    $id = (int)sanitize($conn, $_GET['id']);
    
    if ($id > 0) {
        switch ($type) {
            case 'client':
                if (softDelete('clients', $id)) {
                    $message = showSuccess("Client supprimé avec succès");
                } else {
                    $message = showError("Erreur lors de la suppression du client");
                }
                break;
                
            case 'vol':
                if (softDelete('vols', $id)) {
                    $message = showSuccess("Vol supprimé avec succès");
                } else {
                    $message = showError("Erreur lors de la suppression du vol");
                }
                break;
                
            case 'reservation':
                if (softDelete('reservations', $id)) {
                    $message = showSuccess("Réservation supprimée avec succès");
                } else {
                    $message = showError("Erreur lors de la suppression de la réservation");
                }
                break;
                
            default:
                $message = showError("Type d'élément invalide");
        }
    }
}

// Suppression d'un client via formulaire
if (isset($_POST['supprimer_client'])) {
    // Vérification du token CSRF
    if (!isset($_POST['csrf_token']) || !validateCsrfToken($_POST['csrf_token'])) {
        $message = showError("Erreur de sécurité. Veuillez réessayer.");
    } else {
        $client_id = (int)sanitize($conn, $_POST['client_id']);
        
        if (softDelete('clients', $client_id)) {
            $message = showSuccess("Client supprimé avec succès");
        } else {
            $message = showError("Erreur lors de la suppression du client");
        }
    }
}

// Suppression d'un vol via formulaire
if (isset($_POST['supprimer_vol'])) {
    // Vérification du token CSRF
    if (!isset($_POST['csrf_token']) || !validateCsrfToken($_POST['csrf_token'])) {
        $message = showError("Erreur de sécurité. Veuillez réessayer.");
    } else {
        $vol_id = (int)sanitize($conn, $_POST['vol_id']);
        
        if (softDelete('vols', $vol_id)) {
            $message = showSuccess("Vol supprimé avec succès");
        } else {
            $message = showError("Erreur lors de la suppression du vol");
        }
    }
}

// Suppression d'une réservation via formulaire
if (isset($_POST['supprimer_reservation'])) {
    // Vérification du token CSRF
    if (!isset($_POST['csrf_token']) || !validateCsrfToken($_POST['csrf_token'])) {
        $message = showError("Erreur de sécurité. Veuillez réessayer.");
    } else {
        $reservation_id = (int)sanitize($conn, $_POST['reservation_id']);
        
        if (softDelete('reservations', $reservation_id)) {
            $message = showSuccess("Réservation supprimée avec succès");
        } else {
            $message = showError("Erreur lors de la suppression de la réservation");
        }
    }
}
?>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestion des clients, des vols et des réservations</title>
    <link rel="stylesheet" href="style.css">
</head>

<body>
<h1>Gestion des clients, des vols et des réservations</h1>
<header>
    <?php include "inc/nav.php"?>
</header>
<div class="container">
    
    <?php echo $message; ?>

    <!-- Formulaire pour supprimer un client -->
    <form action="supprimer.php" method="post">
        <input type="hidden" name="csrf_token" value="<?php echo generateCsrfToken(); ?>">
        
        <label for="client_id">Client à supprimer :</label>
        <select id="client_id" name="client_id" required>
            <?php
            $clients = fetchAll("SELECT id, nom, prenom FROM clients WHERE supprime = 0");
            
            foreach ($clients as $client) {
                echo "<option value='".$client["id"]."'>".$client["nom"]." ".$client["prenom"]."</option>";
            }
            ?>
        </select>
        <button type="submit" name="supprimer_client">Supprimer Client</button>
    </form>

    <!-- Formulaire pour supprimer un vol -->
    <form action="supprimer.php" method="post">
        <input type="hidden" name="csrf_token" value="<?php echo generateCsrfToken(); ?>">
        
        <label for="vol_id">Vol à supprimer :</label>
        <select id="vol_id" name="vol_id" required>
            <?php
            $vols = fetchAll("SELECT id, compagnie, origine, destination FROM vols WHERE supprime = 0");
            
            foreach ($vols as $vol) {
                echo "<option value='".$vol["id"]."'>".$vol["compagnie"].": ".$vol["origine"]." - ".$vol["destination"]."</option>";
            }
            ?>
        </select>
        <button type="submit" name="supprimer_vol">Supprimer Vol</button>
    </form>

    <!-- Formulaire pour supprimer une réservation -->
    <form action="supprimer.php" method="post">
        <input type="hidden" name="csrf_token" value="<?php echo generateCsrfToken(); ?>">
        
        <label for="reservation_id">Réservation à supprimer :</label>
        <select id="reservation_id" name="reservation_id" required>
            <?php
            $reservations = fetchAll("SELECT r.id, c.nom, c.prenom, v.compagnie, v.origine, v.destination 
                                     FROM reservations r
                                     INNER JOIN clients c ON r.client_id = c.id 
                                     INNER JOIN vols v ON r.vol_id = v.id
                                     WHERE r.supprime = 0");
            
            foreach ($reservations as $reservation) {
                echo "<option value='".$reservation["id"]."'>".$reservation["nom"]." ".$reservation["prenom"]." - ".$reservation["compagnie"].": ".$reservation["origine"]." - ".$reservation["destination"]."</option>";
            }
            ?>
        </select>
        <button type="submit" name="supprimer_reservation">Supprimer Réservation</button>
    </form>

</div>
</body>
</html>
