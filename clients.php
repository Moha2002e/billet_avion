<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Liste des Clients</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
<h1>Liste des Clients</h1>
<header>
    <?php include "inc/nav.php"?>
</header>
<div class="container">
    <?php
    // Inclusion des fichiers de configuration
    require_once 'config/config.php';
    require_once 'config/functions.php';
    
    // Initialisation de la connexion
    $conn = getDbConnection();
    
    // Récupération des clients de façon sécurisée
    $clients = fetchAll("SELECT id, nom, prenom, tel FROM clients WHERE supprime = 0");
    ?>

    <table>
        <thead>
        <tr>
            <th>ID</th>
            <th>Nom</th>
            <th>Prénom</th>
            <th>Téléphone</th>
            <th>Actions</th>
        </tr>
        </thead>
        <tbody>
        <?php
        if (!empty($clients)) {
            foreach ($clients as $client) {
                echo "<tr>
                    <td>".$client["id"]."</td>
                    <td>".$client["nom"]."</td>
                    <td>".$client["prenom"]."</td>
                    <td>".$client["tel"]."</td>
                    <td>
                        <a href='edit_client.php?id=".$client["id"]."' class='btn-edit'>Modifier</a>
                        <a href='supprimer.php?type=client&id=".$client["id"]."' class='btn-delete' onclick='return confirm(\"Êtes-vous sûr de vouloir supprimer ce client ?\")'>Supprimer</a>
                    </td>
                </tr>";
            }
        } else {
            echo "<tr><td colspan='5'>Aucun client trouvé.</td></tr>";
        }
        ?>
        </tbody>
    </table>
</div>
</body>
</html>
