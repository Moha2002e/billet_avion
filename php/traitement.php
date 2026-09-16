<?php
// Connexion à la base de données (à adapter selon votre configuration)
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "billet";

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Ajout d'un client
if (isset($_POST['ajouter_client'])) {
    $nom = $_POST['nom'];
    $prenom = $_POST['prenom'];
    $tel = $_POST['tel'];

    $sql = "INSERT INTO clients (nom, prenom, tel) VALUES ('$nom', '$prenom', '$tel')";

    if ($conn->query($sql) === TRUE) {
        echo "Client ajouté avec succès";
    } else {
        echo "Erreur lors de l'ajout du client : " . $conn->error;
    }
}

// Ajout d'un vol
if (isset($_POST['ajouter_vol'])) {
    $compagnie = $_POST['compagnie'];
    $origine = $_POST['origine'];
    $destination = $_POST['destination'];
    $prix = $_POST['prix'];

    $sql = "INSERT INTO vols (compagnie, origine, destination, prix) VALUES ('$compagnie', '$origine', '$destination', '$prix')";

    if ($conn->query($sql) === TRUE) {
        echo "Vol ajouté avec succès";
    } else {
        echo "Erreur lors de l'ajout du vol : " . $conn->error;
    }
}

$conn->close();
?>
