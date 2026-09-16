<?php
session_start();
require_once 'config/config.php';
require_once 'config/functions.php';

// Initialisation de la connexion
$conn = getDbConnection();
$message = "";
$client = null;

// Vérifier si un ID est fourni
if (isset($_GET['id'])) {
    $id = (int)sanitize($conn, $_GET['id']);
    
    // Récupérer les informations du client
    $client = fetchOne("SELECT id, nom, prenom, tel FROM clients WHERE id = ? AND supprime = 0", [$id]);
    
    if (!$client) {
        $message = showError("Client non trouvé");
    }
}

// Traitement du formulaire de mise à jour
if (isset($_POST['modifier_client'])) {
    // Vérification du token CSRF
    if (!isset($_POST['csrf_token']) || !validateCsrfToken($_POST['csrf_token'])) {
        $message = showError("Erreur de sécurité. Veuillez réessayer.");
    } else {
        // Validation des données
        $rules = [
            'id' => 'required|numeric',
            'nom' => 'required',
            'prenom' => 'required',
            'tel' => 'required|tel'
        ];
        
        $errors = validate($_POST, $rules);
        
        if (empty($errors)) {
            // Préparation des données
            $id = (int)sanitize($conn, $_POST['id']);
            $data = [
                'nom' => sanitize($conn, $_POST['nom']),
                'prenom' => sanitize($conn, $_POST['prenom']),
                'tel' => sanitize($conn, $_POST['tel'])
            ];
            
            // Mise à jour sécurisée
            if (update('clients', $data, 'id = ?', [$id])) {
                $message = showSuccess("Client modifié avec succès");
                // Récupérer les données mises à jour
                $client = fetchOne("SELECT id, nom, prenom, tel FROM clients WHERE id = ?", [$id]);
            } else {
                $message = showError("Erreur lors de la modification du client");
            }
        } else {
            // Affichage des erreurs de validation
            foreach ($errors as $error) {
                $message .= showError($error);
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
    <title>Modifier un Client</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
<h1>Modifier un Client</h1>
<header>
    <?php include "inc/nav.php"?>
</header>
<div class="container">
    <?php echo $message; ?>
    
    <?php if ($client): ?>
        <form action="edit_client.php" method="post">
            <input type="hidden" name="csrf_token" value="<?php echo generateCsrfToken(); ?>">
            <input type="hidden" name="id" value="<?php echo $client['id']; ?>">
            
            <label for="nom">Nom :</label>
            <input type="text" id="nom" name="nom" value="<?php echo htmlspecialchars($client['nom']); ?>" required>
            
            <label for="prenom">Prénom :</label>
            <input type="text" id="prenom" name="prenom" value="<?php echo htmlspecialchars($client['prenom']); ?>" required>
            
            <label for="tel">Téléphone :</label>
            <input type="tel" id="tel" name="tel" value="<?php echo htmlspecialchars($client['tel']); ?>" required>
            
            <button type="submit" name="modifier_client">Modifier Client</button>
        </form>
    <?php else: ?>
        <p>Veuillez sélectionner un client à modifier.</p>
        <a href="clients.php" class="btn">Retour à la liste des clients</a>
    <?php endif; ?>
</div>
</body>
</html>
