<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Liste des Clients</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
<h1>Liste des Vols</h1>
<header>
    <?php include "inc/nav.php"?>
</header>
<div class="container">

<table>
    <thead>
    <tr>
        <th>ID</th>
        <th>companie</th>
        <th>origine</th>
        <th>destination</th>
        <th>prix</th>
    </tr>
    </thead>
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

    $sql = "SELECT id, compagnie, origine, destination,prix FROM vols WHERE supprime = 0";
    $result = $conn->query($sql);

    if ($result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            echo "<tr><td>".$row["id"]."</td><td>".$row["compagnie"]."</td><td>".$row["origine"]."</td><td>".$row["destination"]."</td><td>".$row["prix"]."€</td></tr>";
        }
    } else {
        echo "Aucun client trouvé.";
    }
    $conn->close();
    ?>
</table>
</div>
</body>
</html>
